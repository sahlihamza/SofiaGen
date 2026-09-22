const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const Store = require("../models/Store");
const FormSetting = require("../models/FormSetting");
const emailSettingsService = require("./emailSettingsService");

// MAIL-02  store SMTP settings: encrypted at rest, never returned in the
// clear, and isolated per store (store A must never read/affect store B's
// SMTP config just by changing a storeId).

let storeA;
let storeB;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  storeA = await Store.create({ name: "__mail02_test__ Store A" });
  storeB = await Store.create({ name: "__mail02_test__ Store B" });
});

test.after(async () => {
  await FormSetting.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } });
  await Store.deleteMany({ _id: { $in: [storeA?._id, storeB?._id] } });
  await mongoose.disconnect();
});

test("getSmtpSettings: a store with nothing configured reads as disabled, no password configured", async () => {
  const result = await emailSettingsService.getSmtpSettings(storeA._id);
  assert.equal(result.enabled, false);
  assert.equal(result.passwordConfigured, false);
  assert.equal(result.host, "");
});

test("updateSmtpSettings: password is encrypted at rest, never returned in the response", async () => {
  const result = await emailSettingsService.updateSmtpSettings(storeA._id, {
    enabled: true,
    host: "smtp.store-a.example.com",
    port: 587,
    secure: false,
    username: "store-a@example.com",
    password: "super-secret-password",
  });

  assert.equal(result.passwordConfigured, true);
  assert.equal(result.password, undefined, "password must never appear in the response");
  assert.equal(result.passwordEncrypted, undefined, "the raw encrypted value must never appear either");

  const raw = await FormSetting.findOne({ storeId: storeA._id }).select("+smtp.pass +smtp.passwordEncrypted");
  assert.notEqual(raw.smtp.passwordEncrypted, "super-secret-password", "must not be stored in plaintext");
  assert.equal(raw.getSmtpPassword(), "super-secret-password", "must decrypt back to the original value");
});

test("updateSmtpSettings: omitting the password on a later update keeps the existing one", async () => {
  await emailSettingsService.updateSmtpSettings(storeA._id, {
    host: "smtp.store-a-v2.example.com",
    // password intentionally omitted
  });

  const result = await emailSettingsService.getSmtpSettings(storeA._id);
  assert.equal(result.host, "smtp.store-a-v2.example.com");
  assert.equal(result.passwordConfigured, true);

  const raw = await FormSetting.findOne({ storeId: storeA._id }).select("+smtp.pass +smtp.passwordEncrypted");
  assert.equal(raw.getSmtpPassword(), "super-secret-password", "unrelated field update must not clear the password");
});

test("store isolation: store B never sees store A's SMTP settings", async () => {
  const bBefore = await emailSettingsService.getSmtpSettings(storeB._id);
  assert.equal(bBefore.enabled, false);
  assert.equal(bBefore.host, "");
  assert.equal(bBefore.passwordConfigured, false);
});

test("store isolation: configuring store B's SMTP does not affect store A's", async () => {
  await emailSettingsService.updateSmtpSettings(storeB._id, {
    enabled: true,
    host: "smtp.store-b.example.com",
    username: "store-b@example.com",
    password: "store-b-password",
  });

  const a = await emailSettingsService.getSmtpSettings(storeA._id);
  const b = await emailSettingsService.getSmtpSettings(storeB._id);

  assert.equal(a.host, "smtp.store-a-v2.example.com");
  assert.equal(b.host, "smtp.store-b.example.com");

  const rawA = await FormSetting.findOne({ storeId: storeA._id }).select("+smtp.passwordEncrypted");
  const rawB = await FormSetting.findOne({ storeId: storeB._id }).select("+smtp.passwordEncrypted");
  assert.equal(rawA.getSmtpPassword(), "super-secret-password");
  assert.equal(rawB.getSmtpPassword(), "store-b-password");
});

test("updateSmtpSettings: enabling SMTP without a host is rejected", async () => {
  await assert.rejects(
    () => emailSettingsService.updateSmtpSettings(storeA._id, { enabled: true, host: "" }),
    /L'hôte SMTP est obligatoire/
  );
});
