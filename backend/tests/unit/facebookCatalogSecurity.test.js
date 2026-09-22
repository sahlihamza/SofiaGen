const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_test";

describe("FacebookCatalogService - multi-tenant isolation", () => {
  let svc;
  let storeA, storeB;
  let productA1, productA2, productB1;

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
    const GalleryProduct = require("../../src/models/GalleryProduct");

    storeA = await Store.create({ name: "Store A", slug: "store-a", status: "active" });
    storeB = await Store.create({ name: "Store B", slug: "store-b", status: "active" });

    productA1 = await Product.create({
      storeId: storeA._id,
      productName: "Product A1",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 100,
      manageStock: false,
    });
    await GalleryProduct.create({ product: productA1._id, image: "https://cdn.example.com/a1.jpg" });

    productA2 = await Product.create({
      storeId: storeA._id,
      productName: "Product A2",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 200,
      manageStock: false,
    });
    await GalleryProduct.create({ product: productA2._id, image: "https://cdn.example.com/a2.jpg" });

    productB1 = await Product.create({
      storeId: storeB._id,
      productName: "Product B1",
      productType: "simple",
      status: "published",
      visibility: "public",
      regularPrice: 999,
      manageStock: false,
    });
    await GalleryProduct.create({ product: productB1._id, image: "https://cdn.example.com/b1.jpg" });
  });

  test("Store A feed only contains Store A products", async () => {
    const result = await svc.generateFeed(storeA._id, { force: true });
    expect(result.xml).toContain("Product A1");
    expect(result.xml).toContain("Product A2");
    expect(result.xml).not.toContain("Product B1");
    expect(result.xml).not.toContain("999.000 TND");
    expect(result.productCount).toBe(2);
  });

  test("Store B feed only contains Store B products", async () => {
    const result = await svc.generateFeed(storeB._id, { force: true });
    expect(result.xml).toContain("Product B1");
    expect(result.xml).not.toContain("Product A1");
    expect(result.xml).not.toContain("Product A2");
    expect(result.productCount).toBe(1);
  });

  test("Store A and Store B feeds have strictly different content", async () => {
    const rA = await svc.generateFeed(storeA._id, { force: true });
    const rB = await svc.generateFeed(storeB._id, { force: true });
    expect(rA.xml).not.toBe(rB.xml);
    const idsA = (rA.xml.match(/<g:id>([^<]+)<\/g:id>/g) || []).sort();
    const idsB = (rB.xml.match(/<g:id>([^<]+)<\/g:id>/g) || []).sort();
    for (const id of idsA) expect(idsB).not.toContain(id);
  });

  test("inactive Store returns null from resolveStoreBySlug", async () => {
    const Store = require("../../src/models/Store");
    await Store.create({ name: "Inactive", slug: "inactive-store", status: "suspended" });
    expect(await svc.resolveStoreBySlug("inactive-store")).toBeNull();
  });

  test("non-existent slug returns null", async () => {
    expect(await svc.resolveStoreBySlug("does-not-exist")).toBeNull();
  });

  test("public feed is only accessible when settings.enabled=true", async () => {
    await svc.getOrCreateSettings(storeA._id);
    const ctrl = require("../../src/controller/facebookCatalogController");

    const reqOff = { params: { slug: "store-a" }, ip: "127.0.0.1", headers: {} };
    const resOff = mockRes();
    await ctrl.getPublicFeed(reqOff, resOff);
    expect(resOff.statusCode).toBe(404);

    await svc.updateSettings(storeA._id, { enabled: true });

    const reqOn = { params: { slug: "store-a" }, ip: "127.0.0.1", headers: {} };
    const resOn = mockRes();
    await ctrl.getPublicFeed(reqOn, resOn);
    expect(resOn.statusCode).toBe(200);
    expect(resOn.headers["Content-Type"]).toContain("application/xml");
    expect(resOn.body).toContain("Product A1");
  });
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.set = (k, v) => {
    res.headers = res.headers || {};
    res.headers[k] = v;
    return res;
  };
  res.type = (t) => {
    res.headers = res.headers || {};
    res.headers["Content-Type"] = t;
    return res;
  };
  res.send = (body) => {
    res.body = body;
    return res;
  };
  return res;
};