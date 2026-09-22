const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const MarketingSettings = require("../src/models/MarketingSettings");
const { sanitizeBody, DEFAULT_DOC } = require("../src/service/marketingSettingsService");
const metaCapi = require("../src/service/marketing/metaCapiService");

const setEncryptionEnv = () => {
  process.env.PAYMENT_ENCRYPTION_KEY =
    process.env.PAYMENT_ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789ab";
};

test("MarketingSettings  schema enforces per-store uniqueness", async () => {
  setEncryptionEnv();
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_marketing_test"
  );
  await MarketingSettings.deleteMany({});

  const storeA = new mongoose.Types.ObjectId();
  const doc1 = await MarketingSettings.create({ storeId: storeA });
  assert.equal(String(doc1.storeId), String(storeA));

  await assert.rejects(
    () => MarketingSettings.create({ storeId: storeA }),
    /duplicate key/i
  );

  const storeB = new mongoose.Types.ObjectId();
  const doc2 = await MarketingSettings.create({ storeId: storeB });
  assert.notEqual(String(doc1._id), String(doc2._id));

  await MarketingSettings.deleteMany({});
  await mongoose.connection.close();
});

test("MarketingSettings  CAPI token is encrypted at rest and masked in JSON", async () => {
  setEncryptionEnv();
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_marketing_test"
  );
  await MarketingSettings.deleteMany({});

  const storeId = new mongoose.Types.ObjectId();
  const doc = await MarketingSettings.create({
    storeId,
    meta: {
      capiEnabled: true,
      capiPixelId: "123456789012345",
      capiAccessToken: "EAAB-SECRET-TOKEN-9999",
    },
  });

  const rawFromDb = await MarketingSettings.findOne({ storeId }).select("+meta.capiAccessToken");
  assert.notEqual(rawFromDb.meta.capiAccessToken, "EAAB-SECRET-TOKEN-9999");
  assert.match(rawFromDb.meta.capiAccessToken, /^[0-9a-f]{32}:[0-9a-f]+$/);

  const plainToken = doc.getCapiAccessToken();
  assert.equal(plainToken, "EAAB-SECRET-TOKEN-9999");

  const projection = doc.publicProjection();
  assert.equal("capiAccessToken" in projection.meta, false);
  assert.equal(projection.meta.capiConfigured, true);

  const json = doc.toJSON();
  assert.equal("capiAccessToken" in (json.meta || {}), false);

  await MarketingSettings.deleteMany({});
  await mongoose.connection.close();
});

test("MarketingSettings  invalid Pixel ID is rejected", async () => {
  setEncryptionEnv();
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_marketing_test"
  );
  await MarketingSettings.deleteMany({});

  await assert.rejects(
    () =>
      MarketingSettings.create({
        storeId: new mongoose.Types.ObjectId(),
        meta: { pixelEnabled: true, pixelId: "not-a-number" },
      }),
    /Pixel ID invalide/
  );

  await MarketingSettings.deleteMany({});
  await mongoose.connection.close();
});

test("MarketingSettings  invalid GA4 Measurement ID is rejected", async () => {
  setEncryptionEnv();
  await mongoose.connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen_marketing_test"
  );
  await MarketingSettings.deleteMany({});

  await assert.rejects(
    () =>
      MarketingSettings.create({
        storeId: new mongoose.Types.ObjectId(),
        google: { analyticsEnabled: true, measurementId: "ABC123" },
      }),
    /Measurement ID invalide/
  );

  await MarketingSettings.deleteMany({});
  await mongoose.connection.close();
});

test("sanitizeBody  coerces and trims values", () => {
  const out = sanitizeBody({
    meta: { pixelEnabled: "true", pixelId: "  123456 ", capiAccessToken: "" },
    google: { analyticsEnabled: 1, measurementId: "  G-ABC1234  " },
    sitemap: { enabled: false, customUrls: ["https://x.com", "ftp://bad"] },
  });
  assert.equal(out.meta.pixelEnabled, true);
  assert.equal(out.meta.pixelId, "123456");
  assert.equal(out.google.measurementId, "G-ABC1234");
  assert.equal(out.sitemap.enabled, false);
  assert.deepEqual(out.sitemap.customUrls, ["https://x.com"]);
  assert.equal(out.meta.capiAccessToken, "");
});

test("metaCapi.sendCapiEvent  short-circuits when config missing", async () => {
  const r = await metaCapi.sendCapiEvent({ pixelId: null, accessToken: null, payload: null });
  assert.equal(r.ok, false);
  assert.equal(r.status, 0);
});

test("metaCapi.buildPurchasePayload  generates a valid dedup event", () => {
  const p = metaCapi.buildPurchasePayload({
    eventId: "order_123_purchase",
    pixelId: "123456",
    customData: { currency: "TND", value: 125 },
    user: {},
  });
  assert.equal(p.data[0].event_name, "Purchase");
  assert.equal(p.data[0].event_id, "order_123_purchase");
  assert.equal(p.data[0].action_source, "website");
  assert.equal(typeof p.data[0].event_time, "number");
});

test("DEFAULT_DOC  sane defaults with no TND hardcode, no secrets", () => {
  const d = DEFAULT_DOC();
  assert.equal(d.meta.capiAccessToken, undefined);
  assert.equal(d.sitemap.enabled, true);
  assert.equal(d.consent.requireMarketingConsent, true);
});