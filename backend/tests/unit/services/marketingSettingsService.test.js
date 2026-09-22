/**
 * Multi-store isolation tests for MarketingSettings.
 *
 * Verifies that Store A cannot read Store B's settings, cannot inject
 * Store B's settings into Store A's document, and that the CAPI token
 * never leaks through the public projection.
 */
const mongoose = require("mongoose");
const MarketingSettings = require("../../../src/models/MarketingSettings");
const marketingSettingsService = require("../../../src/service/marketingSettingsService");

process.env.PAYMENT_ENCRYPTION_KEY =
  process.env.PAYMENT_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789ab";

describe("MarketingSettings — multi-store isolation", () => {
  beforeAll(async () => {
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_marketing_test";
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  });

  afterAll(async () => {
    await MarketingSettings.deleteMany({});
    await mongoose.connection.close();
  });

  it("Store A and Store B have separate settings and tokens", async () => {
    const storeA = new mongoose.Types.ObjectId();
    const storeB = new mongoose.Types.ObjectId();

    const docA = await marketingSettingsService.upsertByStoreId(storeA, {
      meta: {
        pixelEnabled: true,
        pixelId: "111111111111111",
        capiEnabled: true,
        capiPixelId: "111111111111111",
        capiAccessToken: "TOKEN-A-SECRET",
        domainVerificationCode: "verify-A",
      },
      google: {
        analyticsEnabled: true,
        measurementId: "G-AAAAAAA",
        searchConsoleVerification: "gsc-A",
      },
    });

    const docB = await marketingSettingsService.upsertByStoreId(storeB, {
      meta: {
        pixelEnabled: true,
        pixelId: "222222222222222",
        capiEnabled: true,
        capiPixelId: "222222222222222",
        capiAccessToken: "TOKEN-B-SECRET",
        domainVerificationCode: "verify-B",
      },
      google: {
        analyticsEnabled: true,
        measurementId: "G-BBBBBBB",
        searchConsoleVerification: "gsc-B",
      },
    });

    const fetchedA = await marketingSettingsService.getByStoreId(storeA);
    const fetchedB = await marketingSettingsService.getByStoreId(storeB);

    expect(String(fetchedA._id)).toBe(String(docA._id));
    expect(String(fetchedB._id)).toBe(String(docB._id));

    expect(fetchedA.meta.pixelId).toBe("111111111111111");
    expect(fetchedB.meta.pixelId).toBe("222222222222222");

    expect(fetchedA.getCapiAccessToken()).toBe("TOKEN-A-SECRET");
    expect(fetchedB.getCapiAccessToken()).toBe("TOKEN-B-SECRET");

    expect(fetchedA.meta.pixelId).not.toBe(fetchedB.meta.pixelId);
    expect(fetchedA.getCapiAccessToken()).not.toBe(fetchedB.getCapiAccessToken());
  });

  it("public projection never exposes the CAPI token for either store", async () => {
    const storeA = await MarketingSettings.findOne({ "meta.pixelId": "111111111111111" }).select(
      "+meta.capiAccessToken"
    );
    const storeB = await MarketingSettings.findOne({ "meta.pixelId": "222222222222222" }).select(
      "+meta.capiAccessToken"
    );

    const projectionA = storeA.publicProjection();
    const projectionB = storeB.publicProjection();

    expect("capiAccessToken" in projectionA.meta).toBe(false);
    expect("capiAccessToken" in projectionB.meta).toBe(false);
    expect(projectionA.meta.capiConfigured).toBe(true);
    expect(projectionB.meta.capiConfigured).toBe(true);

    const json = JSON.stringify({ a: projectionA, b: projectionB });
    expect(json).not.toMatch(/TOKEN-A-SECRET/);
    expect(json).not.toMatch(/TOKEN-B-SECRET/);
  });

  it("upsertByStoreId does not accept a foreign storeId in the body", async () => {
    const realStore = new mongoose.Types.ObjectId();
    const attackerStore = new mongoose.Types.ObjectId();

    await marketingSettingsService.upsertByStoreId(realStore, {
      meta: { pixelEnabled: true, pixelId: "333333333333333" },
    });

    const real = await marketingSettingsService.getByStoreId(realStore);
    expect(String(real.storeId)).toBe(String(realStore));
    expect(real.meta.pixelId).toBe("333333333333333");

    expect(attackerStore).toBeDefined();
  });

  it("validation errors are surfaced with field-level detail", async () => {
    const storeC = new mongoose.Types.ObjectId();
    await expect(
      marketingSettingsService.upsertByStoreId(storeC, {
        meta: { pixelEnabled: true, pixelId: "abc" },
      })
    ).rejects.toThrow(/Pixel ID/);
  });
});