const logger = require("../../config/logger");
const rateLimit = require("../../utils/rateLimit");
const EmailConfigResolver = require("./EmailConfigResolver");
const EmailTransportFactory = require("./EmailTransportFactory");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Maps each email type to the permission code required to send it when the
// send is attributed to a user (system/service sends have no userId and skip
// this check entirely  see send()).
const EMAIL_PERMISSIONS = {
  transactional: "email:send:transactional",
  marketing: "email:send:marketing",
  notification: "email:send:notification",
  password_reset: "email:send:password_reset",
};

/**
 * The single entry point for sending an email anywhere in the backend.
 *
 *   Business Service
 *      EmailService.send({ channel, storeId?, type, to, ... })
 *        EmailConfigResolver   (platform vs store SMTP)
 *        EmailTransportFactory (the only nodemailer.createTransport)
 *        Nodemailer
 *
 * @param {Object} params
 * @param {"platform"|"store"} [params.channel="platform"] - Which SMTP identity to send as.
 * @param {string} [params.storeId] - Required for channel:"store" to resolve that store's SMTP.
 * @param {string} [params.type="transactional"] - Semantic email type (e.g. "store.order.created",
 *   "password_reset", "invitation"). Drives the permission check and forces channel:"platform"
 *   for credential/security types regardless of what was passed in.
 * @param {string} params.to - Recipient address.
 * @param {string} [params.cc]
 * @param {string} [params.bcc]
 * @param {string} [params.from] - Overrides the identity EmailConfigResolver would otherwise pick.
 * @param {string} [params.replyTo]
 * @param {string} params.subject
 * @param {string} [params.html]
 * @param {string} [params.text]
 * @param {Array} [params.attachments] - Passed straight through to nodemailer.
 * @param {Object} [params.context] - Authorization context for the permission/consent checks.
 * @param {string} [params.context.userId] - Sending user; omit for system/service sends.
 * @param {string[]} [params.context.userPermissions] - Permission codes the user holds.
 * @param {string} [params.relatedEntity] - e.g. an orderId, for the audit log.
 */
const send = async ({
  channel = "platform",
  storeId,
  type = "transactional",
  to,
  cc,
  bcc,
  from,
  replyTo,
  subject,
  html,
  text,
  attachments,
  context = {},
  relatedEntity = null,
}) => {
  // 1. Basic validation.
  if (!to) {
    throw new Error("EmailService.send: 'to' is required");
  }
  if (!subject || (!html && !text)) {
    throw new Error("EmailService.send: subject and html/text are required");
  }
  if (!EMAIL_REGEX.test(to)) {
    throw new Error("Invalid recipient email format");
  }

  const { userId, storeId: contextStoreId, userPermissions = [] } = context;
  const effectiveStoreId = storeId || contextStoreId;

  // 2. Permission check  only enforced when the send is attributed to a
  // user AND that user's permission set was explicitly provided. System
  // sends (no userId) are the caller's own responsibility to gate.
  if (userId && userPermissions.length > 0) {
    const requiredPermission = EMAIL_PERMISSIONS[type];
    if (requiredPermission && !userPermissions.includes(requiredPermission)) {
      logger.warn(`= SECURITY: User ${userId} tried to send ${type} email without permission`);
      throw new Error(`Permission denied: ${requiredPermission} required for ${type} emails`);
    }
  }

  // 3. Rate limiting (anti-spam / anti-abuse).
  const rateLimitKey = userId ? `email:user:${userId}` : `email:global:${to}`;
  const rateLimitResult = await rateLimit.check(rateLimitKey, { max: 10, window: 60 * 1000 });
  if (!rateLimitResult.allowed) {
    logger.warn(`= RATE LIMIT: Email send rate limit exceeded for ${userId || to}`);
    throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s`);
  }

  // 4. Marketing consent (GDPR / CCPA).
  if (type === "marketing") {
    const hasConsent = await checkMarketingConsent(to, effectiveStoreId);
    if (!hasConsent) {
      logger.warn(`= COMPLIANCE: Marketing email blocked - no consent for ${to}`);
      throw new Error("Recipient has not opted in for marketing emails");
    }
  }

  // 5. Resolve transport + default identity (store SMTP only for
  // channel:"store" with a configured store; forced-platform types and
  // stores without SMTP fall back to platform automatically).
  const resolved = await EmailConfigResolver.resolve({ channel, storeId: effectiveStoreId, type });
  const transport = EmailTransportFactory.getTransport(resolved.transportConfig);

  const mail = {
    from: from || resolved.identity.from,
    to,
    cc: cc || undefined,
    bcc: bcc || undefined,
    replyTo: replyTo || resolved.identity.replyTo,
    charset: "UTF-8",
    subject,
    html,
    text,
    attachments: attachments || undefined,
  };

  // 6. Send. No verify() here  a slow/broken SMTP server must not add a
  // round-trip to every email; verification happens at boot instead.
  try {
    const result = await transport.sendMail(mail);

    logger.info({
      action: "email.sent",
      to,
      subject,
      type,
      channel: resolved.channel,
      storeId: effectiveStoreId || null,
      by: userId || null,
      relatedEntity,
      messageId: result.messageId,
    });

    return result;
  } catch (err) {
    // A store's own SMTP failing is logged under its own action (MAIL-02)
    // so it's distinguishable from a platform-side failure  this is
    // deliberately NOT treated as "not configured": the caller gets the
    // error, nothing silently retries over the platform transport.
    logger.error({
      action: resolved.channel === "store" ? "store.email.smtp.failed" : "email.failed",
      to,
      subject,
      type,
      channel: resolved.channel,
      storeId: effectiveStoreId || null,
      by: userId || null,
      error: err.message,
    });
    throw err;
  }
};

async function checkMarketingConsent(email, storeId) {
  try {
    const Customer = require("../../models/Customer");
    const customer = await Customer.findOne({
      email: email.toLowerCase(),
      storeId,
      deletedAt: null,
    })
      .select("marketingConsent newsletter")
      .lean();

    if (!customer) return false;
    return customer.marketingConsent === true || customer.newsletter === true;
  } catch (err) {
    logger.error(`checkMarketingConsent failed: ${err.message}`);
    // Fail closed: never send marketing emails when consent cannot be verified.
    return false;
  }
}

const enqueue = (...args) => require("./EmailQueue").enqueue(...args);

module.exports = { send, enqueue, EMAIL_PERMISSIONS };
