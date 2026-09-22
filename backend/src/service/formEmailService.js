const FormSetting = require("../models/FormSetting");
const { getStoreTransport } = require("./email/EmailTransportFactory");

/**
 * Récupère (ou cré) un transport SMTP pour le store, via l'unique factory
 * de transports (EmailTransportFactory  voir MAIL-01). Le transport est mis
 * en cache par la factory elle-même,  la clé de la config de connexion.
 * Retourne null si le SMTP n'est pas configuré.
 */
async function getTransporter(storeId) {
  const setting = await FormSetting.findOne({ storeId })
    .select("+smtp.pass +smtp.passwordEncrypted")
    .lean();
  if (!setting || !setting.smtp || !setting.smtp.enabled || !setting.smtp.host) {
    return { transporter: null, setting };
  }

  // The password fields are select:false (encrypted at rest  see MAIL-02);
  // decrypt it here, the one place it's actually needed.
  const smtp = { ...setting.smtp, pass: FormSetting.decryptSmtpPassword(setting.smtp) };
  const transporter = getStoreTransport(smtp);
  return { transporter, setting };
}

/**
 * échappe du texte pour un rendu HTML sûr (anti-XSS dans les emails).
 */
function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Construit le corps HTML de l'email  partir des valeurs du formulaire.
 */
function buildEmailHtml({ formTitle, fields, values }) {
  const rows = fields
    .filter((f) => f.type !== "html" && f.type !== "file")
    .map((f) => {
      const raw = values[f.name];
      let display;
      if (Array.isArray(raw)) {
        display = raw.map((v) => (v && typeof v === "object" ? v.name : v)).join(", ");
      } else if (raw && typeof raw === "object") {
        display = JSON.stringify(raw);
      } else {
        display = raw == null ? "" : raw;
      }
      return `<tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:600;background:#f9fafb;width:35%">${escapeHtml(f.label || f.name)}</td><td style="padding:8px 12px;border:1px solid #eee;white-space:pre-wrap">${escapeHtml(display)}</td></tr>`;
    })
    .join("");

  const files = (fields.find((f) => f.type === "file") && values[fields.find((f) => f.type === "file").name]) || [];
  const fileRows = Array.isArray(files) && files.length
    ? files.map((fl) => `<tr><td style="padding:8px 12px;border:1px solid #eee;font-weight:600;background:#f9fafb">Fichier</td><td style="padding:8px 12px;border:1px solid #eee"><a href="${escapeHtml(fl.url)}">${escapeHtml(fl.name)}</a> (${(fl.size / 1024).toFixed(0)} Ko)</td></tr>`).join("")
    : "";

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111827">
    <h2 style="margin:0 0 16px">${escapeHtml(formTitle || "Nouvelle soumission")}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px">${rows}${fileRows}</table>
    <p style="color:#6b7280;font-size:12px;margin-top:16px">Soumis depuis votre formulaire storefront.</p>
  </body></html>`;
}

function buildEmailText({ formTitle, fields, values }) {
  const lines = fields
    .filter((f) => f.type !== "html" && f.type !== "file")
    .map((f) => {
      const raw = values[f.name];
      const display = Array.isArray(raw) ? raw.join(", ") : raw;
      return `${f.label || f.name}: ${display == null ? "" : display}`;
    });
  return `${formTitle || "Nouvelle soumission"}\n\n${lines.join("\n")}`;
}

/**
 * Envoie l'email de notification d'une soumission.
 * @param {Object} args { storeId, emailAction: {to,from,subject,replyTo}, formTitle, fields, values }
 * @returns {Promise<{ok:boolean, messageId?:string, error?:string}>}
 */
async function sendSubmissionEmail({ storeId, emailAction, formTitle, fields, values }) {
  const { transporter, setting } = await getTransporter(storeId);
  if (!transporter) {
    return { ok: false, error: "SMTP non configuré pour cette boutique." };
  }

  const to = emailAction?.to || setting.smtp.fromEmail;
  if (!to) return { ok: false, error: "Destinataire manquant." };

  const fromName = emailAction?.fromName || setting.smtp.fromName || "Formulaire";
  const fromEmail = setting.smtp.fromEmail || emailAction?.from;
  if (!fromEmail) return { ok: false, error: "Expéditeur SMTP manquant." };

  const replyToEmail = values.email || emailAction?.replyTo || "";

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo: replyToEmail || undefined,
      charset: "UTF-8",
      subject: emailAction?.subject || `Nouvelle soumission : ${formTitle || "Formulaire"}`,
      text: buildEmailText({ formTitle, fields, values }),
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${buildEmailHtml({ formTitle, fields, values })}</body></html>`,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendSubmissionEmail, getTransporter };
