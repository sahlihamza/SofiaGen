const nodemailer = require("nodemailer");
const logger = require("../../config/logger");

// The ONLY place in the backend allowed to call nodemailer.createTransport.
// Every other module (config/mailer.js, utils/mailer.js, lib/email-sender/sender.js,
// lib/EmailProvider.js, formEmailService.js, ...) must go through EmailService,
// which resolves a config via EmailConfigResolver and asks this factory for the
// matching transport instead of building its own.

// Transports are pooled by a fingerprint of their connection config so the same
// SMTP account (platform or a given store's) reuses one pooled connection
// instead of opening a new one per email.
const transportCache = new Map();
const MAX_CACHE_SIZE = 50;

const fingerprint = (config) =>
  JSON.stringify({
    host: config.host,
    port: config.port,
    secure: config.secure,
    service: config.service || null,
    user: config.auth?.user || null,
  });

/**
 * Returns a pooled nodemailer transport for the given connection config.
 * Does NOT call verify()  verification only happens at boot (verifyOnBoot)
 * or via an explicit test-send endpoint, never on the hot send path (a slow
 * or unreachable SMTP server must not add a round-trip to every email sent).
 */
function getTransport(config) {
  const key = fingerprint(config);
  const cached = transportCache.get(key);
  if (cached) return cached;

  if (transportCache.size >= MAX_CACHE_SIZE) {
    // Simple bound so a store rotating SMTP creds repeatedly can't leak
    // transports forever  not expected to be hit in practice.
    transportCache.clear();
  }

  const transport = nodemailer.createTransport(config);
  if (config._sofiaSource) transport._sofiaSource = config._sofiaSource;
  // Ensure every email is sent with UTF-8 charset by default
  const originalSendMail = transport.sendMail.bind(transport);
  transport.sendMail = function (mail, callback) {
    if (typeof mail === "object" && mail !== null && mail.charset === undefined) {
      mail.charset = "UTF-8";
    }
    return originalSendMail(mail, callback);
  };
  transportCache.set(key, transport);
  return transport;
}

/**
 * MAIL-Platform: when the Super Admin changes the platform SMTP, evict the
 * cached transports created from the previous database/env configuration so
 * the very next email uses the new one (fingerprint alone would leave the old
 * pooled connection alive until cache eviction).
 */
function invalidatePlatformTransports() {
  let removed = 0;
  for (const [key, transport] of transportCache) {
    if (transport._sofiaSource === "platform") {
      try {
        transport.close();
      } catch (e) {
        /* already closed */
      }
      transportCache.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/**
 * Builds the platform (SofiaGen-owned) transport config from env vars 
 * SMTP_SECURE is explicit  it no longer silently defaults to true; it falls
 * back to "port 465 implies TLS" only when unset, per the standard SMTP
 * convention (465 = implicit TLS, 587/25 = STARTTLS or plain).
 */
function platformTransportConfig() {
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE != null
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const hasRealCredentials =
    emailUser &&
    emailPass &&
    emailUser !== "your email" &&
    emailPass !== "your 16digit email app password";

  if (!hasRealCredentials) {
    // Same "swallow the send, don't crash the app" fallback the old
    // config/mailer.js used for local dev with no mail credentials.
    return { host: "localhost", port: 25, ignoreTLS: true, _sofiaSource: "platform" };
  }

  return {
    service: process.env.SERVICE || undefined,
    host: process.env.SMTP_HOST || process.env.HOST,
    port,
    secure,
    auth: { user: emailUser, pass: emailPass },
    _sofiaSource: "platform",
  };
}

/**
 * Builds a store transport config from that store's SMTP settings
 * (see EmailConfigResolver  currently backed by FormSetting.smtp).
 */
function storeTransportConfig({ host, port, secure, user, pass }) {
  return {
    host,
    port: Number(port) || 587,
    secure: !!secure,
    auth: user || pass ? { user, pass } : undefined,
  };
}

function getPlatformTransport() {
  return getTransport(platformTransportConfig());
}

function getStoreTransport(smtpConfig) {
  return getTransport(storeTransportConfig(smtpConfig));
}

/**
 * Verifies a transport. Call this at boot and from an explicit "send test
 * email" endpoint only  never from the send() hot path.
 */
async function verify(transport) {
  try {
    await transport.verify();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function verifyOnBoot() {
  // Resolve the active platform source (database first, environment fallback)
  // before verifying so boot health matches the transport used for sends.
  const { getPlatformSmtpConfig } = require("./EmailConfigResolver");
  const result = await verify(getTransport(await getPlatformSmtpConfig()));
  if (result.ok) {
    logger.info(" Serveur mail (platform) prét  envoyer des messages");
  } else {
    logger.error(`L Erreur de configuration mailer platform: ${result.error}`);
  }
  return result;
}

module.exports = {
  getTransport,
  getPlatformTransport,
  getStoreTransport,
  platformTransportConfig,
  storeTransportConfig,
  invalidatePlatformTransports,
  verify,
  verifyOnBoot,
};
