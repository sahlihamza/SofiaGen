const EmailSettings = require("../models/EmailSettings");
const Store = require("../models/Store");
const GeneralSettings = require("../models/GeneralSettings");
const FormSetting = require("../models/FormSetting");
const auditLogService = require("./auditLogService");
const { diffFields, formatDiffSummary } = require("../utils/auditDiff");
const { sendEmail } = require("../utils/mailer");
const EmailConfigResolver = require("./email/EmailConfigResolver");
const {
  DEFAULT_EMAIL_NOTIFICATIONS,
  DEFAULT_EMAIL_TEMPLATE,
  EMAIL_NOTIFICATION_KEYS,
  renderEmailPlaceholders,
  renderNotificationPreviewHtml,
  getCurrencySymbol,
} = require("../utils/emailNotifications");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmailListField = (value, fieldName) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return;

  const invalidEmail = trimmed
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .find((email) => !EMAIL_REGEX.test(email));

  if (invalidEmail) {
    const error = new Error(
      `Adresse e-mail invalide dans ${fieldName}: ${invalidEmail}`
    );
    error.name = "InvalidRecipientEmail";
    throw error;
  }
};

class EmailSettingsService {
  async getByStoreId(storeId) {
    let settings = await EmailSettings.findOne({ storeId });

    if (!settings) {
      try {
        settings = await EmailSettings.create({
          storeId,
          notifications: DEFAULT_EMAIL_NOTIFICATIONS,
        });
        return this._sorted(settings);
      } catch (error) {
        if (error.code !== 11000) throw error;
        settings = await EmailSettings.findOne({ storeId });
        if (!settings) throw error;
      }
    }

    // Merge in any notification added to the defaults after this store's
    // settings document was first created.
    const existingKeys = settings.notifications.map((n) => n.key);
    const missing = DEFAULT_EMAIL_NOTIFICATIONS.filter(
      (n) => !existingKeys.includes(n.key)
    );

    if (missing.length > 0) {
      settings.notifications.push(...missing);
      await settings.save();
    }

    return this._sorted(settings);
  }

  async upsertByStoreId(storeId, notifications, actor = null) {
    this._validateNotifications(notifications);

    const before = await this.getByStoreId(storeId);
    const beforeByKey = Object.fromEntries(
      before.notifications.map((n) => [n.key, n.toObject ? n.toObject() : n])
    );

    const settings = await EmailSettings.findOneAndUpdate(
      { storeId },
      { $set: { notifications }, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const changes = notifications.flatMap((notification) =>
      diffFields(beforeByKey[notification.key] || {}, notification).map((c) => ({
        ...c,
        field: `${notification.key}.${c.field}`,
      }))
    );

    await auditLogService.log({
      storeId,
      action: "settings_updated",
      entityType: "EmailSettings.notifications",
      entityId: String(settings._id),
      summary: `Notifications e-mail : ${formatDiffSummary(changes)}`,
      metadata: { changes },
      actor,
    });

    return this._sorted(settings);
  }

  async toggleNotification(storeId, key, enabled, actor = null) {
    if (!EMAIL_NOTIFICATION_KEYS.includes(key)) {
      const error = new Error(`Notification e-mail inconnue: ${key}`);
      error.name = "UnknownEmailNotification";
      throw error;
    }

    const settings = await this.getByStoreId(storeId);
    const notification = settings.notifications.find((n) => n.key === key);

    if (!notification) {
      const error = new Error(`Notification e-mail introuvable: ${key}`);
      error.name = "EmailNotificationNotFound";
      throw error;
    }

    notification.enabled = enabled;
    await settings.save();

    await auditLogService.log({
      storeId,
      action: "settings_updated",
      entityType: "EmailSettings.notifications",
      entityId: key,
      summary: `Notification e-mail "${key}" ${enabled ? "activé" : "désactivé"}`,
      actor,
    });

    return this._sorted(settings);
  }

  // Helper for the sending flow: returns the notification config if the
  // notification exists and is enabled for this store, otherwise null.
  async getEnabledNotification(storeId, key) {
    const settings = await this.getByStoreId(storeId);
    const notification = settings.notifications.find((n) => n.key === key);

    if (!notification || !notification.enabled) {
      return null;
    }

    return notification;
  }

  // Same as above but resolves the store itself: the currently selected
  // store, falling back to the first active one. Fail-open: if the store or
  // the settings cannot be resolved, emails keep being sent with their
  // hardcoded defaults instead of silently breaking customer flows.
  async getNotificationForActiveStore(key) {
    try {
      const Store = require("../models/Store");
      const store =
        (await Store.findOne({ isSelected: true })) ||
        (await Store.findOne({ isActive: true }));

      if (!store) {
        return { enabled: true, notification: null };
      }

      const settings = await this.getByStoreId(store._id);
      const notification = settings.notifications.find((n) => n.key === key);

      if (!notification) {
        return { enabled: true, notification: null };
      }

      return { enabled: !!notification.enabled, notification };
    } catch (err) {
      return { enabled: true, notification: null };
    }
  }

  _validateNotifications(notifications) {
    if (!Array.isArray(notifications)) {
      const error = new Error("notifications doit être un tableau");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    const keys = notifications.map((n) => n.key);
    const invalidKey = keys.find((key) => !EMAIL_NOTIFICATION_KEYS.includes(key));

    if (invalidKey) {
      const error = new Error(`Notification e-mail inconnue: ${invalidKey}`);
      error.name = "UnknownEmailNotification";
      throw error;
    }

    const hasDuplicates = new Set(keys).size !== keys.length;
    if (hasDuplicates) {
      const error = new Error("Les notifications e-mail doivent être uniques");
      error.name = "DuplicateEmailNotification";
      throw error;
    }

    for (const notification of notifications) {
      validateEmailListField(notification.recipients, "destinataires");
      validateEmailListField(notification.cc, "Cc");
      validateEmailListField(notification.bcc, "Bcc");
    }
  }

  _validateTemplate(template) {
    const allowedAlignments = ["left", "center", "right"];
    if (
      template.headerAlignment &&
      !allowedAlignments.includes(template.headerAlignment)
    ) {
      const error = new Error(
        `Alignement d'en-tête invalide: ${template.headerAlignment}`
      );
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    if (
      template.logoWidth !== undefined &&
      template.logoWidth !== null &&
      (isNaN(Number(template.logoWidth)) || Number(template.logoWidth) <= 0)
    ) {
      const error = new Error("La largeur du logo doit être un nombre positif");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    if (template.fromEmail && !EMAIL_REGEX.test(template.fromEmail)) {
      const error = new Error(
        `Adresse e-mail d'expéditeur invalide: ${template.fromEmail}`
      );
      error.name = "InvalidRecipientEmail";
      throw error;
    }

    const hexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    const colorFields = [
      "baseColor",
      "backgroundColor",
      "bodyBackgroundColor",
      "bodyTextColor",
      "secondaryTextColor",
    ];
    for (const field of colorFields) {
      if (template[field] && !hexRegex.test(template[field])) {
        const error = new Error(`Couleur invalide pour ${field}: ${template[field]}`);
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
    }
  }

  async getTemplate(storeId) {
    const settings = await this.getByStoreId(storeId);
    return { ...DEFAULT_EMAIL_TEMPLATE, ...(settings.template?.toObject?.() || settings.template || {}) };
  }

  async upsertTemplate(storeId, templateUpdates, actor = null) {
    this._validateTemplate(templateUpdates);

    const current = await this.getTemplate(storeId);
    const merged = { ...current, ...templateUpdates };

    const settings = await EmailSettings.findOneAndUpdate(
      { storeId },
      { $set: { template: merged }, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const changes = diffFields(current, merged);

    await auditLogService.log({
      storeId,
      action: "settings_updated",
      entityType: "EmailSettings.template",
      entityId: String(settings._id),
      summary: `Modèle d'e-mail : ${formatDiffSummary(changes)}`,
      metadata: { changes },
      actor,
    });

    return { ...DEFAULT_EMAIL_TEMPLATE, ...(settings.template?.toObject?.() || settings.template || {}) };
  }
  async renderPreview(storeId, key, draft = {}) {
    const { templateOverride, ...notificationDraft } = draft;

    const settings = await this.getByStoreId(storeId);
    const notification = settings.notifications.find((n) => n.key === key);

    if (!notification) {
      const error = new Error(`Notification e-mail introuvable: ${key}`);
      error.name = "EmailNotificationNotFound";
      throw error;
    }

    const merged = {
      ...(notification.toObject?.() || notification),
      ...notificationDraft,
    };

    const store = await Store.findById(storeId);
    const generalSettings = await GeneralSettings.findOne({ storeId }).lean();
    const template = {
      ...(await this.getTemplate(storeId)),
      ...(templateOverride || {}),
    };

    return renderNotificationPreviewHtml({
      notification: merged,
      template,
      storeName: store?.name || "Ma Boutique",
      currencySymbol: getCurrencySymbol(generalSettings?.currencyId?.isoCode),
    });
  }

  async sendTestEmail(storeId, key, draft = {}, testEmail) {
    if (!testEmail || !EMAIL_REGEX.test(testEmail)) {
      const error = new Error("Adresse e-mail de test invalide");
      error.name = "InvalidRecipientEmail";
      throw error;
    }

    const settings = await this.getByStoreId(storeId);
    const notification = settings.notifications.find((n) => n.key === key);

    if (!notification) {
      const error = new Error(`Notification e-mail introuvable: ${key}`);
      error.name = "EmailNotificationNotFound";
      throw error;
    }

    const merged = {
      ...(notification.toObject?.() || notification),
      ...draft,
    };

    const store = await Store.findById(storeId);
    const html = await this.renderPreview(storeId, key, draft);
    const subject = renderEmailPlaceholders(merged.subject, {
      store_name: store?.name || "Ma Boutique",
      order_number: "12345",
    });

    const template = await this.getTemplate(storeId);
    const from =
      template.fromEmail &&
      `${template.fromName || store?.name || "Ma Boutique"} <${template.fromEmail}>`;

    return sendEmail({
      to: testEmail,
      from: from || undefined,
      storeId,
      channel: "store",
      cc: merged.cc,
      bcc: merged.bcc,
      subject: `[TEST] ${subject}`,
      html,
    });
  }

  //     Store SMTP (MAIL-02)                                                
  // Distinct from the "notifications" settings above: this is the store's
  // own transport (host/port/credentials), never returned with a password 
  // callers only ever learn whether one is configured.
  _toSmtpResponse(smtp) {
    return {
      enabled: !!smtp?.enabled,
      host: smtp?.host || "",
      port: smtp?.port || 587,
      secure: !!smtp?.secure,
      username: smtp?.user || "",
      passwordConfigured: !!(smtp?.passwordEncrypted || smtp?.pass),
    };
  }

  async getSmtpSettings(storeId) {
    const setting = await FormSetting.findOne({ storeId }).select(
      "+smtp.pass +smtp.passwordEncrypted"
    );
    return this._toSmtpResponse(setting?.smtp);
  }

  async updateSmtpSettings(storeId, data, actor = null) {
    const { enabled, host, port, secure, username, password } = data || {};

    if (host !== undefined && host !== "" && !/^[a-zA-Z0-9.-]+$/.test(String(host).trim())) {
      const error = new Error("Hôte SMTP invalide");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    if (username && !EMAIL_REGEX.test(username)) {
      const error = new Error("Adresse e-mail d'utilisateur SMTP invalide");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    let setting = await FormSetting.findOne({ storeId }).select(
      "+smtp.pass +smtp.passwordEncrypted"
    );
    if (!setting) {
      setting = new FormSetting({ storeId });
    }

    const before = this._toSmtpResponse(setting.smtp);

    if (enabled !== undefined) setting.smtp.enabled = !!enabled;
    if (host !== undefined) setting.smtp.host = String(host).trim();
    if (port !== undefined) setting.smtp.port = Number(port) || 587;
    if (secure !== undefined) setting.smtp.secure = !!secure;
    if (username !== undefined) setting.smtp.user = String(username).trim();
    // Omitted/empty password = keep the one already stored (never overwrite
    // with a blank on every save just because the UI field was left empty).
    if (password) {
      setting.smtp.passwordEncrypted = password; // encrypted by the pre-save hook
      setting.smtp.pass = "";
    }

    if (setting.smtp.enabled && !setting.smtp.host) {
      const error = new Error("L'hôte SMTP est obligatoire pour activer le SMTP de la boutique");
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    await setting.save();

    const after = this._toSmtpResponse(setting.smtp);
    const changes = diffFields(before, after);

    await auditLogService.log({
      storeId,
      action: "store.email.settings.updated",
      entityType: "FormSetting.smtp",
      entityId: String(setting._id),
      summary: `Paramètres SMTP de la boutique : ${formatDiffSummary(changes)}`,
      metadata: { changes },
      actor,
    });

    return after;
  }

  async sendSmtpTestEmail(storeId, to, actor = null) {
    if (!to || !EMAIL_REGEX.test(to)) {
      const error = new Error("Adresse e-mail de test invalide");
      error.name = "InvalidRecipientEmail";
      throw error;
    }

    const store = await Store.findById(storeId);
    const storeName = store?.name || "Ma Boutique";

    // Resolved ahead of the actual send purely to tell the caller which
    // channel will be used (store vs. platform fallback)  the UI shows a
    // different message depending on it (see EmailConfigSection).
    const resolved = await EmailConfigResolver.resolve({
      channel: "store",
      storeId,
      type: "transactional",
    });

    await sendEmail({
      to,
      storeId,
      channel: "store",
      type: "transactional",
      subject: `[TEST] Configuration SMTP  ${storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color:#1f2937;">Test de configuration SMTP</h2>
          <p style="color:#374151;">Cet e-mail confirme que la configuration SMTP de <strong>${storeName}</strong> fonctionne correctement.</p>
          <p style="color:#6b7280; font-size:13px;">Envoyé via : ${resolved.channel === "store" ? "le SMTP de la boutique" : "l'infrastructure de la plateforme"}.</p>
        </div>
      `,
    });

    await auditLogService.log({
      storeId,
      action: "store.email.test",
      entityType: "FormSetting.smtp",
      entityId: String(storeId),
      summary: `E-mail de test SMTP envoyé  ${to} (canal : ${resolved.channel})`,
      actor,
    });

    return { sent: true, channel: resolved.channel };
  }

  _sorted(settings) {
    settings.notifications = [...settings.notifications].sort(
      (a, b) => a.order - b.order
    );
    return settings;
  }
}

module.exports = new EmailSettingsService();
