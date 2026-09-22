const nodemailer = require("nodemailer");

/**
 * MAIL-Platform / shared SMTP test utility.
 *
 * Sends a one-off email through a THROWAWAY transport built from the exact
 * values handed in (form values, not the stored configuration). Nothing is
 * persisted, nothing touches the pooled transports cache  Test ` Save.
 *
 * Business emails keep flowing exclusively through EmailService.send() 
 * EmailConfigResolver  EmailTransportFactory; this helper is only for the
 * "Test connection" buttons (Store pattern kept untouched, MAIL-02).
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendTestEmailViaSmtp({
  host,
  port = 587,
  secure = false,
  user = "",
  pass = "",
  fromName = "SofiaGen",
  fromEmail = "",
  to,
  sourceLabel = "Platform",
}) {
  if (!host || !String(host).trim()) {
    const error = new Error("SMTP host is required");
    error.name = "ValidationError";
    throw error;
  }
  if (!to || !EMAIL_REGEX.test(String(to))) {
    const error = new Error("A valid recipient e-mail address is required");
    error.name = "InvalidRecipientEmail";
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: String(host).trim(),
    port: Number(port) || 587,
    secure: !!secure,
    auth: user || pass ? { user, pass } : undefined,
    // Bounded so a wrong host doesn't hang the HTTP request forever.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    defaults: {
      charset: "UTF-8",
    },
  });

  try {
     const info = await transporter.sendMail({
      from: `"${fromName || "SofiaGen"}" <${fromEmail || user || "no-reply@sofiagen.local"}>`,
      to,
      charset: "UTF-8",
      subject: `[TEST] Configuration SMTP  ${sourceLabel}`,
      text: `SMTP test OK (${sourceLabel}).`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;"><h2 style="color:#1f2937;">Test de configuration SMTP</h2><p style="color:#374151;">Cet e-mail confirme que la configuration SMTP <strong>${sourceLabel}</strong> fonctionne correctement.</p></body></html>`,
    });
    return { ok: true, messageId: info.messageId };
  } finally {
    try {
      transporter.close();
    } catch (e) {
      /* noop */
    }
  }
}

module.exports = { sendTestEmailViaSmtp, EMAIL_REGEX };
