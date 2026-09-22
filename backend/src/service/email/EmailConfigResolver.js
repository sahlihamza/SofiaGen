const FormSetting = require("../../models/FormSetting");
const EmailSettings = require("../../models/EmailSettings");
const PlatformSettings = require("../../models/PlatformSettings");
const { platformTransportConfig } = require("./EmailTransportFactory");
const { decrypt, isEncrypted } = require("../../utils/encryption");

// Email types that must always go out over the platform's own SMTP, never a
// store's  credential/security emails should never depend on a store owner
// having correctly configured (or not broken) their own SMTP. Also covers
// platform billing (MAIL-03: invoices/subscriptions are platform business,
// never a tenant store's).
const FORCED_PLATFORM_TYPES = new Set([
  "password_reset",
  "staff_welcome",
  "invitation",
  "security_alert",
  "platform_billing",
]);

/**
 * Store-level SMTP credentials  FormSetting.smtp (see MAIL-02). The
 * password is encrypted at rest (smtp.passwordEncrypted); this decrypts it
 * for the one moment it's actually needed, to hand to nodemailer.
 */
async function getStoreSmtpConfig(storeId) {
  if (!storeId) return null;

  const setting = await FormSetting.findOne({ storeId })
    .select("+smtp.pass +smtp.passwordEncrypted")
    .lean();
  if (!setting || !setting.smtp || !setting.smtp.enabled || !setting.smtp.host) {
    return null;
  }

  return {
    ...setting.smtp,
    pass: FormSetting.decryptSmtpPassword(setting.smtp),
  };
}

async function platformIdentity() {
  let fromName;
  let fromEmail;
  let replyTo;

  try {
    const settings = await PlatformSettings.findOne().select("email").lean();
    fromName = settings?.email?.fromName;
    fromEmail = settings?.email?.fromEmail;
    replyTo = settings?.email?.replyTo;
  } catch {
    // fall through to the env-based identity below
  }

  const envFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;
  const from = fromEmail
    ? fromName
      ? `"${fromName}" <${fromEmail}>`
      : fromEmail
    : envFrom;

  return { from, replyTo: replyTo || undefined };
}

/**
 * The store's SMTP send identity comes from EmailSettings.template
 * (fromName/fromEmail  the same fields EmailConfigSection's "notifications"
 * tab already manages), not from FormSetting.smtp  those are transport
 * credentials, not a display identity (see MAIL-02: "transport vs identity
 * séparés"). Falls back to the SMTP account's own address only if the store
 * never set a template identity.
 */
async function storeIdentity(storeId, smtp) {
  let fromName;
  let fromEmail;

  try {
    const settings = await EmailSettings.findOne({ storeId }).select("template").lean();
    fromName = settings?.template?.fromName;
    fromEmail = settings?.template?.fromEmail;
  } catch {
    // fall through to the SMTP account identity below
  }

  fromEmail = fromEmail || smtp.fromEmail || smtp.user;
  fromName = fromName || smtp.fromName;

  return {
    from: fromEmail ? (fromName ? `"${fromName}" <${fromEmail}>` : fromEmail) : undefined,
    replyTo: undefined,
  };
}

/**
 * Resolves which transport + default identity a given send should use.
 *
 * Rule: a store's own SMTP is used only when explicitly requested
 * (channel: "store") AND that store actually has SMTP configured. Any other
 * case (no storeId, store has no SMTP, or the email type is forced-platform)
 * falls back to the platform transport  never the other way around (a
 * store's already-configured SMTP failing to send is NOT a reason to fall
 * back silently; that failure should surface to the caller  see
 * EmailService's store.email.smtp.failed log).
 */
async function resolve({ channel = "platform", storeId, type } = {}) {
  const forcedPlatform = FORCED_PLATFORM_TYPES.has(type);

  if (!forcedPlatform && channel === "store" && storeId) {
    const smtp = await getStoreSmtpConfig(storeId);
    if (smtp) {
      return {
        channel: "store",
        transportConfig: {
          host: smtp.host,
          port: Number(smtp.port) || 587,
          secure: !!smtp.secure,
          auth: smtp.user || smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
        },
        identity: await storeIdentity(storeId, smtp),
      };
    }
  }

  return {
    channel: "platform",
    transportConfig: await getPlatformSmtpConfig(),
    identity: await platformIdentity(),
  };
}

/**
 * MAIL-Platform: DB configuration wins when explicitly enabled; otherwise
 * falls back to the environment variables (existing deployments keep working
 * untouched until a Super Admin activates the database configuration).
 */
async function getPlatformSmtpConfig() {
  try {
    const settings = await PlatformSettings.findOne()
      .select("+smtp.passwordEncrypted")
      .lean();
    const smtp = settings?.smtp;
    if (smtp?.enabled && smtp.host) {
      const encrypted = smtp.passwordEncrypted || "";
      const pass = encrypted
        ? isEncrypted(encrypted)
          ? decrypt(encrypted)
          : encrypted
        : "";
      return {
        _sofiaSource: "platform",
        _sofiaConfigSource: "database",
        host: smtp.host,
        port: Number(smtp.port) || 587,
        secure: !!smtp.secure,
        auth: smtp.user || pass ? { user: smtp.user, pass } : undefined,
      };
    }
  } catch (e) {
    // Malformed/absent settings must never break email sending  env fallback.
  }
  return platformTransportConfig();
}

module.exports = { resolve, getPlatformSmtpConfig, getStoreSmtpConfig, FORCED_PLATFORM_TYPES };
