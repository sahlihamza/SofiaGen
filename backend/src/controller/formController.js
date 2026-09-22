const path = require("path");
const fs = require("fs");
const multer = require("multer");

const FormSubmission = require("../models/FormSubmission");
const FormSetting = require("../models/FormSetting");
const { validateForm, flattenFields, sanitizeSchema } = require("../lib/formValidator");
const { sendSubmissionEmail } = require("../service/formEmailService");
const { sendWebhook, runIntegrations } = require("../service/formIntegrationService");

/**
 * Configuration multer pour les fichiers de formulaire.
 * On accepte tout type mais avec une taille plafonné et une liste d'extensions
 * autorisés configurable (par défaut on bloque les exécutables dangereux).
 */
const FORBIDDEN_EXT = [".exe", ".bat", ".cmd", ".sh", ".js", ".php", ".jsp", ".asp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo / fichier
const MAX_FILES = 10;

const formFolder = (storeId) => {
  const dir = path.join(process.cwd(), "public", "form-uploads", String(storeId || "common"));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storeId = req.params.storeId || "common";
    cb(null, formFolder(storeId));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 40);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${base}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (FORBIDDEN_EXT.includes(ext)) {
    return cb(new Error("Type de fichier non autorisé."));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

/**
 * POST /api/forms/:storeId/submit
 * Body: multipart/form-data
 *   - config        : JSON string (schéma + actions)  issu du data-config builder
 *   - captchaToken  : (optionnel) jeton captcha
 *   - <field names> : valeurs des champs (fichiers inclus)
 */
const submitForm = async (req, res) => {
  try {
    const { storeId } = req.params;
    let config;
    try {
      config = typeof req.body.config === "string" ? JSON.parse(req.body.config) : req.body.config;
    } catch {
      return res.status(400).json({ ok: false, message: "Configuration de formulaire invalide." });
    }
    if (!config || !config.formId) {
      return res.status(400).json({ ok: false, message: "Formulaire introuvable." });
    }

    // --- Schéma : nettoyage + aplatit (multi-step) ---
    const rawFields = flattenFields(config);
    const fields = sanitizeSchema(rawFields);

    // --- Extraction des valeurs depuis le FormData ---
    const values = {};
    for (const field of fields) {
      if (field.type === "html") continue;
      if (field.type === "file") {
        // multer range les fichiers dans req.files avec fieldname = name
        const files = (req.files || []).filter((f) => f.fieldname === field.name);
        values[field.name] = files.map((f) => ({
          name: f.originalname,
          url: `${req.protocol}://${req.get("host")}/static/form-uploads/${storeId}/${f.filename}`,
          size: f.size,
          mimetype: f.mimetype,
        }));
        continue;
      }
      if (field.type === "multiselect" || field.type === "checkbox" || field.type === "repeater") {
        // Valeurs multiples encodés en JSON string par le frontend.
        const raw = req.body[field.name];
        try {
          values[field.name] = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch {
          values[field.name] = raw;
        }
        continue;
      }
      values[field.name] = req.body[field.name] ?? "";
    }

    // --- Validation stricte serveur ---
    const { errors, valid } = validateForm(fields, values);
    if (!valid) {
      return res.status(422).json({ ok: false, message: "Validation échoué.", errors });
    }

    // --- Anti-spam : score heuristique léger (honeypot déjà géré par middleware) ---
    let isSpam = false;

    // --- Persistance ---
    const submission = await FormSubmission.create({
      storeId: storeId !== "common" ? storeId : undefined,
      formId: config.formId,
      formTitle: config.title || "",
      fields,
      values,
      isSpam,
      meta: {
        ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        referrer: req.headers["referer"] || "",
      },
    });

    // --- Actions (fire-and-forget, journalisés) ---
    const actionsLog = {};
    const actions = config.actions || {};

    // 1) Email
    if (actions.email?.enabled) {
      actionsLog.email = await sendSubmissionEmail({
        storeId,
        emailAction: actions.email,
        formTitle: config.title,
        fields,
        values,
      });
    }

    // 2) Webhook
    if (actions.webhook?.enabled && actions.webhook.url) {
      actionsLog.webhook = await sendWebhook({
        url: actions.webhook.url,
        method: actions.webhook.method || "POST",
        headers: actions.webhook.headers || {},
        payload: { formId: config.formId, values, meta: submission.meta },
      });
    }

    // 3) Intégrations (config widget + config store)
    if (Array.isArray(actions.integrations) && actions.integrations.length) {
      actionsLog.integrations = await runIntegrations({
        storeId,
        values,
        formIntegrations: actions.integrations,
        integrationSettings: req.formSetting?.integrations || [],
      });
    }

    submission.actionsLog = actionsLog;
    submission.markModified("actionsLog");
    await submission.save().catch(() => {});

    // --- Réponse ---
    const messages = config.messages || {};
    return res.status(200).json({
      ok: true,
      message: messages.success || "Merci, votre message a bien t envoyé.",
      submissionId: submission._id,
      redirect: actions.redirect?.enabled ? actions.redirect.url : undefined,
    });
  } catch (err) {
    console.error("[formController] submitForm error:", err);
    return res.status(500).json({ ok: false, message: "Une erreur est survenue." });
  }
};

/* ----------------------- Admin (gestion des soumissions) ----------------------- */
// Les routes admin sont protégés par isAuth + isAdmin au niveau du routeur.

const listSubmissions = async (req, res) => {
  try {
    const { storeId, formId, status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (storeId) q.storeId = storeId;
    if (formId) q.formId = formId;
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      FormSubmission.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      FormSubmission.countDocuments(q),
    ]);
    res.json({ data, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSubmission = async (req, res) => {
  try {
    const sub = await FormSubmission.findById(req.params.id).lean();
    if (!sub) return res.status(404).json({ message: "Soumission introuvable." });
    if (!sub.readAt) {
      await FormSubmission.findByIdAndUpdate(req.params.id, { readAt: new Date(), status: "read" });
    }
    res.json({ data: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateSubmissionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const sub = await FormSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: "Introuvable." });
    res.json({ data: sub });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteSubmission = async (req, res) => {
  try {
    await FormSubmission.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Export CSV des soumissions d'un formulaire.
 */
const exportSubmissions = async (req, res) => {
  try {
    const { storeId, formId } = req.query;
    const q = {};
    if (storeId) q.storeId = storeId;
    if (formId) q.formId = formId;
    const subs = await FormSubmission.find(q).sort({ createdAt: -1 }).limit(1000).lean();
    if (!subs.length) return res.status(404).json({ message: "Aucune soumission." });

    // Colonnes = union des noms de champs.
    const cols = new Set(["createdAt", "status"]);
    subs.forEach((s) => Object.keys(s.values || {}).forEach((k) => cols.add(k)));
    const headers = Array.from(cols);
    const escape = (v) => {
      const s = v == null ? "" : (Array.isArray(v) ? v.join(", ") : (typeof v === "object" ? JSON.stringify(v) : String(v)));
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = subs.map((s) => headers.map((h) => escape(h === "createdAt" ? new Date(s.createdAt).toISOString() : h === "status" ? s.status : s.values?.[h])).join(","));
    const csv = [headers.map(escape).join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="submissions-${formId || "all"}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ----------------------- Settings (SMTP + intégrations) ----------------------- */

const getFormSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const setting = await FormSetting.findOne({ storeId }).lean();
    res.json({ data: setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const upsertFormSettings = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { smtp, recaptcha, integrations } = req.body;
    const setting = await FormSetting.findOneAndUpdate(
      { storeId },
      { $set: { smtp, recaptcha, integrations } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ data: setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  upload,
  submitForm,
  listSubmissions,
  getSubmission,
  updateSubmissionStatus,
  deleteSubmission,
  exportSubmissions,
  getFormSettings,
  upsertFormSettings,
};
