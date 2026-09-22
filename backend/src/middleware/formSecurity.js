const rateLimit = require("express-rate-limit");
const axios = require("axios");
const FormSetting = require("../models/FormSetting");

/**
 * formSecurity  défense en profondeur pour les soumissions publiques.
 *
 *  1. honeypot        : champ caché "website" ; s'il est rempli => bot => 204
 *                       (on répond OK pour ne pas alerter le bot, sans traiter).
 *  2. rate limiting   : plafond par IP pour limiter le spam/flood.
 *  3. captcha         : reCAPTCHA v3 OU Cloudflare Turnstile (au choix, par
 *                       store). Vérification serveur du token.
 *
 * Tout est best-effort : on logge mais on ne casse pas l'UX si un service
 * tiers est injoignable (sauf si le captcha est strictement requis).
 */

// Honeypot + rate-limit appliqués sur la route submit.
const HONEYPOT_FIELD = "website"; // doit matcher le champ caché du frontend.

function honeypot(req, res, next) {
  const body = req.body || {};
  const filled = body[HONEYPOT_FIELD] || (body.fields && body.fields[HONEYPOT_FIELD]);
  if (filled && String(filled).trim() !== "") {
    // Bot détecté : on renvoie un succès factice sans rien stocker.
    req.formSpam = true;
    return res.status(200).json({ ok: true, spam: true });
  }
  next();
}

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 30, // 30 soumissions / 10 min / IP (suffisant pour multi-step réssais)
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: "Trop de soumissions. Réssayez dans quelques minutes." },
});

/**
 * Vérifie un token captcha côté serveur.
 * @param {Object} recaptchaConfig { provider, secretKey }
 * @param {string} token
 * @param {string} remoteIp
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function verifyCaptcha(recaptchaConfig, token, remoteIp) {
  if (!recaptchaConfig || recaptchaConfig.provider === "none") {
    return { ok: true }; // captcha désactivé pour ce store
  }
  if (!token) return { ok: false, error: "Jeton de vérification manquant." };

  try {
    if (recaptchaConfig.provider === "recaptcha") {
      const res = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        null,
        { params: { secret: recaptchaConfig.secretKey, response: token, remoteip: remoteIp }, timeout: 5000 }
      );
      const ok = !!res.data?.success && (res.data.score === undefined || res.data.score >= 0.5);
      return { ok, error: ok ? undefined : "échec de la vérification reCAPTCHA." };
    }
    if (recaptchaConfig.provider === "turnstile") {
      const res = await axios.post(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        new URLSearchParams({
          secret: recaptchaConfig.secretKey,
          response: token,
          remoteip: remoteIp || "",
        }),
        { timeout: 5000, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const ok = !!res.data?.success;
      return { ok, error: ok ? undefined : "échec de la vérification Turnstile." };
    }
    return { ok: true };
  } catch (err) {
    // Service injoignable : on n'accepte pas silencieusement si un captcha est requis.
    return { ok: false, error: "Service de vérification injoignable." };
  }
}

/**
 * Middleware : charge le FormSetting du store et vérifie le captcha.
 * Injecte req.formSetting pour réutilisation par le contrôleur.
 */
async function captchaGuard(req, res, next) {
  try {
    const storeId = req.params.storeId;
    const setting = await FormSetting.findOne({ storeId }).lean();
    req.formSetting = setting;
    if (!setting || !setting.recaptcha || setting.recaptcha.provider === "none") {
      return next();
    }
    const token = req.body.captchaToken || req.body["g-recaptcha-response"] || req.body["cf-turnstile-response"];
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress;
    const result = await verifyCaptcha(setting.recaptcha, token, ip);
    if (!result.ok) {
      return res.status(400).json({ ok: false, message: result.error });
    }
    next();
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Erreur de sécurité." });
  }
}

module.exports = { honeypot, submitLimiter, captchaGuard, verifyCaptcha, HONEYPOT_FIELD };
