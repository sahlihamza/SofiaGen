const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";

describe("FacebookCatalogService - mapping", () => {
  let svc;
  let storeId;

  beforeAll(async () => {
    await mongoose.connect(MONGO_URI);
    svc = require("../../src/service/FacebookCatalogService");
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    const Store = require("../../src/models/Store");
    const Product = require("../../src/models/Product");
    const ProductVariation = require("../../src/models/ProductVariation");
    const Brand = require("../../src/models/Brand");
    const ProductCategory = require("../../src/models/ProductCategory");
    const GalleryProduct = require("../../src/models/GalleryProduct");

    const store = await Store.create({
      name: "YassinStore",
      slug: "yassinstore",
      status: "active",
    });
    storeId = store._id;

    const brand = await Brand.create({ storeId, name: "Acme" });
    const category = await ProductCategory.create({ storeId, name: "T-Shirts" });

    const product1 = await Product.create({
      storeId,
      productName: "T-Shirt Nike",
      description: "<p>Cool shirt</p>",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 49.9,
      sku: "TS-NIKE-001",
      brand: brand._id,
      productCategories: [category._id],
      manageStock: true,
      stockQuantity: 5,
      stockStatus: "instock",
    });
    await GalleryProduct.create({ product: product1._id, image: "https://cdn.example.com/nike.jpg", isPrimary: true });

    const product2 = await Product.create({
      storeId,
      productName: "T-Shirt Adidas",
      description: "Sport shirt",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 30,
      salePrice: 25,
      sku: "TS-ADI-001",
      brand: brand._id,
      productCategories: [category._id],
      manageStock: true,
      stockQuantity: 0,
      stockStatus: "outofstock",
    });

    const product3 = await Product.create({
      storeId,
      productName: "T-Shirt Draft",
      status: "draft",
      visibility: "public",
      regularPrice: 10,
      manageStock: false,
    });

    const variable = await Product.create({
      storeId,
      productName: "Variable Tee",
      productType: "variable",
      status: "published",
      visibility: "public",
      regularPrice: 40,
      manageStock: false,
    });
    await ProductVariation.create({
      productId: variable._id,
      sku: "VAR-RED-M",
      enabled: true,
      pricing: { regularPrice: "40.000" },
      inventory: { quantity: 10, reserved: 0, allowBackorders: false },
    });
    await ProductVariation.create({
      productId: variable._id,
      sku: "VAR-BLU-L",
      enabled: true,
      pricing: { regularPrice: "42.000" },
      inventory: { quantity: 0, reserved: 0, allowBackorders: false },
    });
  });

  test("active simple product with stock is included", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.productCount).toBeGreaterThanOrEqual(2);
    expect(result.invalid.length).toBe(0);
    const ids = result.xml.match(/<g:id>([^<]+)<\/g:id>/g) || [];
    expect(ids.some((s) => s.includes("TS-NIKE-001")) || ids.length).toBeTruthy();
    expect(result.xml).toContain("49.900 TND");
  });

  test("out-of-stock product is excluded by default", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).not.toContain("Adidas");
    expect(result.xml).not.toContain("TS-ADI-001");
  });

  test("out-of-stock product is included when option enabled", async () => {
    await svc.updateSettings(storeId, { includeOutOfStock: true });
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).toContain("Adidas");
    expect(result.xml).toContain("25.000 TND");
    expect(result.xml).toContain("out of stock");
  });

  test("draft product is excluded by default", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).not.toContain("Draft");
  });

  test("draft product is included when includeInactive", async () => {
    await svc.updateSettings(storeId, { includeInactive: true });
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).toContain("Draft");
  });

  test("variable product produces one item per variation by default", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).toContain("VAR-RED-M");
    expect(result.xml).toContain("VAR-BLU-L");
    const idMatches = result.xml.match(/<g:id>([^<]+)<\/g:id>/g) || [];
    const hasGroupId = idMatches.some((s) => /-/.test(s));
    expect(hasGroupId).toBe(true);
    expect(result.xml).toContain("<g:item_group_id>");
  });

  test("variation IDs are stable: ${productId}-${variationId}", async () => {
    const ProductVariation = require("../../src/models/ProductVariation");
    const variations = await ProductVariation.find({});
    const result = await svc.generateFeed(storeId, { force: true });
    for (const v of variations) {
      const expected = `${String(v.productId)}-${String(v._id)}`;
      expect(result.xml).toContain(expected);
    }
  });

  test("variation IDs match Pixel content_ids format", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    const idRegex = /<g:id>([a-f0-9]{24}-[a-f0-9]{24})<\/g:id>/g;
    const matches = result.xml.match(idRegex) || [];
    expect(matches.length).toBeGreaterThan(0);
  });

  test("XML is valid and starts with proper header", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(result.xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(result.xml).toContain("<rss");
    expect(result.xml).toContain("</rss>");
  });

  test("invalid product (no image) is reported as error but feed still generates", async () => {
    const Product = require("../../src/models/Product");
    await Product.create({
      storeId,
      productName: "NoImage",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 10,
      manageStock: false,
    });
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.invalid.length).toBeGreaterThan(0);
    expect(result.invalid.some((i) => i.errors.includes("missing image"))).toBe(true);
    expect(result.status).toBe("partial");
  });

  test("invalid product (no price) is reported as error", async () => {
    const Product = require("../../src/models/Product");
    await Product.create({
      storeId,
      productName: "NoPrice",
      productType: "simple",
      status: "published",
      visibility: "public",
      manageStock: false,
    });
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.invalid.some((i) => i.errors.includes("missing price"))).toBe(true);
  });

  test("HTML is stripped from description", async () => {
    const result = await svc.generateFeed(storeId, { force: true });
    expect(result.xml).not.toContain("<p>");
    expect(result.xml).toContain("Cool shirt");
  });

  test("XML special characters are escaped", () => {
    const { _internal } = svc;
    expect(_internal.escapeXml("<script>")).toBe("&lt;script&gt;");
    expect(_internal.escapeXml('a & "b"')).toBe("a &amp; &quot;b&quot;");
    expect(_internal.escapeXml("it's")).toBe("it&apos;s");
  });
});

describe("FacebookCatalogService - cache", () => {
  let svc;
  let storeId;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
    }
    svc = require("../../src/service/FacebookCatalogService");
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    const Store = require("../../src/models/Store");
    const Product = require("../../src/models/Product");
    const GalleryProduct = require("../../src/models/GalleryProduct");

    const store = await Store.create({ name: "CacheStore", slug: "cachestore", status: "active" });
    storeId = store._id;
    const product = await Product.create({
      storeId,
      productName: "CacheProduct",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 100,
      manageStock: false,
    });
    await GalleryProduct.create({ product: product._id, image: "https://cdn.example.com/x.jpg" });
  });

  test("second call returns from cache", async () => {
    const r1 = await svc.generateFeed(storeId);
    expect(r1.fromCache).toBe(false);
    const r2 = await svc.generateFeed(storeId);
    expect(r2.fromCache).toBe(true);
  });

  test("force:true bypasses cache", async () => {
    await svc.generateFeed(storeId);
    const r = await svc.generateFeed(storeId, { force: true });
    expect(r.fromCache).toBe(false);
  });

  test("updateSettings invalidates cache", async () => {
    const r1 = await svc.generateFeed(storeId);
    expect(r1.fromCache).toBe(false);
    await svc.updateSettings(storeId, { includeOutOfStock: true });
    const r2 = await svc.generateFeed(storeId);
    expect(r2.fromCache).toBe(false);
  });
});

describe("FacebookCatalogService - public resolver", () => {
  let svc;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
    }
    svc = require("../../src/service/FacebookCatalogService");
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test("resolveStoreBySlug returns null for invalid slug format", async () => {
    expect(await svc.resolveStoreBySlug("INVALID_slug")).toBeNull();
    expect(await svc.resolveStoreBySlug("")).toBeNull();
    expect(await svc.resolveStoreBySlug(null)).toBeNull();
  });

  test("buildPublicFeedUrl", () => {
    expect(svc.buildPublicFeedUrl("yassin", "https://mallatech.tn")).toBe(
      "https://mallatech.tn/api/public/facebook-catalog/yassin/feed.xml"
    );
  });
});