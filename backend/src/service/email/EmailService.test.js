const test = require("node:test");
const assert = require("node:assert/strict");
const { mock } = require("node:test");

// MAIL-01  the centralised email pipeline: EmailService -> EmailConfigResolver
// -> EmailTransportFactory -> Nodemailer. These tests stub the transport layer
// (no real SMTP/DB connection) and assert on the *decisions* the pipeline
// makes: which channel it resolves to, that it falls back to platform when a
// store has no SMTP configured, and that every send is logged with its type.

const FormSetting = require("../../models/FormSetting");
const EmailSettings = require("../../models/EmailSettings");
const PlatformSettings = require("../../models/PlatformSettings");
const EmailTransportFactory = require("./EmailTransportFactory");
const EmailConfigResolver = require("./EmailConfigResolver");
const logger = require("../../config/logger");
const rateLimit = require("../../utils/rateLimit");

// FormSetting.findOne(...).select(...).lean() and EmailSettings.findOne(...).select(...).lean()
// are both chained this way in EmailConfigResolver  mock the whole chain so
// these tests never touch a real MongoDB connection.
const chainableLean = (value) => ({ select: () => ({ lean: async () => value }) });

const mockNoPlatformIdentity = (t) =>
  t.mock.method(PlatformSettings, "findOne", () => chainableLean(null));
async function withEnv(vars, fn) {
  const prev = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    return await fn();
  } finally {
    for (const key of Object.keys(prev)) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

test("EmailConfigResolver: no storeId falls back to platform channel", async (t) => {
  mockNoPlatformIdentity(t);
  const resolved = await EmailConfigResolver.resolve({ channel: "store", type: "transactional" });
  assert.equal(resolved.channel, "platform");
});

test("EmailConfigResolver: channel:store with a store that has no SMTP configured falls back to platform", async (t) => {
  t.mock.method(FormSetting, "findOne", () => chainableLean(null));
  mockNoPlatformIdentity(t);

  const resolved = await EmailConfigResolver.resolve({
    channel: "store",
    storeId: "64a000000000000000000099",
    type: "transactional",
  });
  assert.equal(resolved.channel, "platform");
});

test("EmailConfigResolver: channel:store with SMTP configured uses the store's own transport", async (t) => {
  t.mock.method(FormSetting, "findOne", () =>
    chainableLean({
      smtp: {
        enabled: true,
        host: "smtp.store-example.com",
        port: 587,
        secure: false,
        user: "store@store-example.com",
        // Real records carry passwordEncrypted, not plaintext pass  see MAIL-02.
        passwordEncrypted: require("../../utils/encryption").encrypt("secret"),
        fromName: "Ma Boutique",
        fromEmail: "store@store-example.com",
      },
    })
  );
  // No EmailSettings.template identity for this store  falls back to the
  // SMTP account's own address, exercised by the assertion below.
  t.mock.method(EmailSettings, "findOne", () => chainableLean(null));

  const resolved = await EmailConfigResolver.resolve({
    channel: "store",
    storeId: "64a000000000000000000099",
    type: "transactional",
  });
  assert.equal(resolved.channel, "store");
  assert.equal(resolved.transportConfig.host, "smtp.store-example.com");
  assert.equal(resolved.transportConfig.auth.pass, "secret", "must decrypt the stored password");
  assert.match(resolved.identity.from, /store@store-example\.com/);
});

test("EmailConfigResolver: forced-platform types (password_reset) ignore channel:store even with SMTP configured", async (t) => {
  t.mock.method(FormSetting, "findOne", () =>
    chainableLean({ smtp: { enabled: true, host: "smtp.store-example.com" } })
  );
  mockNoPlatformIdentity(t);

  const resolved = await EmailConfigResolver.resolve({
    channel: "store",
    storeId: "64a000000000000000000099",
    type: "password_reset",
  });
  assert.equal(resolved.channel, "platform");
});

test("EmailConfigResolver: platform identity prefers PlatformSettings.email over the env fallback", async (t) => {
  t.mock.method(PlatformSettings, "findOne", () =>
    chainableLean({ email: { fromName: "SofiaGen Team", fromEmail: "hello@sofiagen.com", replyTo: "support@sofiagen.com" } })
  );

  const resolved = await withEnv({ EMAIL_FROM: "env-fallback@example.com" }, () =>
    EmailConfigResolver.resolve({ channel: "platform", type: "transactional" })
  );

  assert.equal(resolved.identity.from, '"SofiaGen Team" <hello@sofiagen.com>');
  assert.equal(resolved.identity.replyTo, "support@sofiagen.com");
});

test("EmailConfigResolver: platform identity falls back to env when PlatformSettings has no email set", async (t) => {
  mockNoPlatformIdentity(t);

  const resolved = await withEnv({ EMAIL_FROM: "env-fallback@example.com" }, () =>
    EmailConfigResolver.resolve({ channel: "platform", type: "transactional" })
  );

  assert.equal(resolved.identity.from, "env-fallback@example.com");
});

test("EmailTransportFactory: platformTransportConfig respects explicit SMTP_SECURE over the port-465 default", async () => {
  await withEnv({ EMAIL_USER: "a@b.com", EMAIL_PASS: "realpass", EMAIL_PORT: "465", SMTP_SECURE: "false" }, () => {
    const config = EmailTransportFactory.platformTransportConfig();
    assert.equal(config.secure, false);
  });
});

test("EmailTransportFactory: platformTransportConfig defaults secure to true only for port 465 when SMTP_SECURE is unset", async () => {
  // Sequential + awaited: withEnv is async (it must await an async fn  see
  // its own comment), so two calls back to back without awaiting the first
  // would race on restoring process.env and leak values into other tests.
  await withEnv({ EMAIL_USER: "a@b.com", EMAIL_PASS: "realpass", EMAIL_PORT: "465", SMTP_SECURE: undefined }, () => {
    assert.equal(EmailTransportFactory.platformTransportConfig().secure, true);
  });
  await withEnv({ EMAIL_USER: "a@b.com", EMAIL_PASS: "realpass", EMAIL_PORT: "587", SMTP_SECURE: undefined }, () => {
    assert.equal(EmailTransportFactory.platformTransportConfig().secure, false);
  });
});

test("EmailTransportFactory: getTransport pools transports by connection fingerprint", () => {
  const config = { host: "smtp.example.com", port: 587, secure: false, auth: { user: "x", pass: "y" } };
  const t1 = EmailTransportFactory.getTransport(config);
  const t2 = EmailTransportFactory.getTransport({ ...config });
  assert.equal(t1, t2, "same connection config must reuse the pooled transport");
});

test("EmailService.send: platform send succeeds and logs the email type", async (t) => {
  const EmailService = require("./EmailService");

  // Isolate from the real rate-limit store (Redis/in-memory cache)  this
  // test is about the send pipeline's own decisions, not rate-limiting.
  t.mock.method(rateLimit, "check", async () => ({ allowed: true, remaining: 9, retryAfter: 0 }));
  mockNoPlatformIdentity(t);

  const sentMails = [];
  t.mock.method(EmailTransportFactory, "getTransport", () => ({
    sendMail: async (mail) => {
      sentMails.push(mail);
      return { messageId: "test-message-id" };
    },
  }));

  const infoLogs = [];
  t.mock.method(logger, "info", (payload) => infoLogs.push(payload));

  const result = await withEnv({ EMAIL_USER: "platform@sofiagen.com", EMAIL_PASS: "x" }, () =>
    EmailService.send({
      to: "customer@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
      type: "transactional",
    })
  );

  assert.equal(result.messageId, "test-message-id");
  assert.equal(sentMails.length, 1);
  assert.equal(sentMails[0].to, "customer@example.com");

  const emailLog = infoLogs.find((l) => l && l.action === "email.sent");
  assert.ok(emailLog, "expected an email.sent log entry");
  assert.equal(emailLog.type, "transactional");
  assert.equal(emailLog.channel, "platform");
});

test("EmailService.send: store channel without SMTP configured still sends, via the platform fallback", async (t) => {
  const EmailService = require("./EmailService");

  t.mock.method(FormSetting, "findOne", () => chainableLean(null));
  t.mock.method(rateLimit, "check", async () => ({ allowed: true, remaining: 9, retryAfter: 0 }));
  mockNoPlatformIdentity(t);

  const sentMails = [];
  t.mock.method(EmailTransportFactory, "getTransport", () => ({
    sendMail: async (mail) => {
      sentMails.push(mail);
      return { messageId: "fallback-message-id" };
    },
  }));

  const infoLogs = [];
  t.mock.method(logger, "info", (payload) => infoLogs.push(payload));

  await EmailService.send({
    to: "customer@example.com",
    storeId: "64a000000000000000000099",
    channel: "store",
    subject: "Order confirmed",
    html: "<p>order</p>",
    type: "store.order.created",
  });

  const emailLog = infoLogs.find((l) => l && l.action === "email.sent");
  assert.equal(emailLog.channel, "platform", "must fall back to platform when the store has no SMTP");
});

test("EmailService.send: rejects when 'to' is missing", async () => {
  const EmailService = require("./EmailService");
  await assert.rejects(() => EmailService.send({ subject: "x", html: "<p>x</p>" }), /'to' is required/);
});

test("EmailService.send: rejects an invalid recipient address", async () => {
  const EmailService = require("./EmailService");
  await assert.rejects(
    () => EmailService.send({ to: "not-an-email", subject: "x", html: "<p>x</p>" }),
    /Invalid recipient email format/
  );
});
