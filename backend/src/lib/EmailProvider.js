const EmailService = require("../service/email/EmailService");

// Deprecated: kept for backward compatibility with existing callers
// (NotificationDispatcher.js). The permission check, rate-limiting, and
// marketing-consent guards this module used to own now live in EmailService
// itself, so this is just a field-name mapper (emailType  type)  see
// MAIL-01. New code should call EmailService.send directly.
const send = async ({ to, subject, html, text, context = {}, emailType = "transactional", relatedEntity = null }) => {
  return EmailService.send({
    to,
    subject,
    html,
    text,
    context,
    type: emailType,
    channel: context.storeId ? "store" : "platform",
    storeId: context.storeId,
    relatedEntity,
  });
};

module.exports = { send, EMAIL_PERMISSIONS: EmailService.EMAIL_PERMISSIONS };
