const PlatformSettings = require("../models/PlatformSettings");
const AuditService = require("./AuditService");
const EmailService = require("./email/EmailService");
const { getPlatformSmtpConfig } = require("./email/EmailConfigResolver");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class PlatformSettingsService {
  async getSettings() {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    return settings;
  }

  async updateSettings(data) {
    const existing = await this.getSettings();
    const allowedFields = [
      "platformName",
      "logo",
      "favicon",
      "marketingSiteUrl",
      "supportEmail",
      "supportUrl",
      "whatsappNumber",
      "currency",
      "timezone",
      "twoFactorRequired",
      "passwordPolicy",
      "sessionTimeout",
      "maxLoginAttempts",
      "lockoutDuration",
      "allowUserRegistration",
      "requireEmailVerification",
      "email",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates[field] = data[field];
      }
    }

    for (const brandingField of ["logo", "favicon"]) {
      if (updates[brandingField]) {
        const url = String(updates[brandingField]).trim();
        if (url && !/^https?:\/\/.+/i.test(url) && !url.startsWith("/")) {
          const error = new Error(`${brandingField} must be a valid http(s) URL or an absolute path`);
          error.name = "ValidationError";
          error.errors = {};
          throw error;
        }
        updates[brandingField] = url;
      }
    }

    if (updates.marketingSiteUrl !== undefined) {
      const url = String(updates.marketingSiteUrl).trim();
      if (url && !/^https?:\/\/.+/i.test(url)) {
        const error = new Error("marketingSiteUrl must be a valid http(s) URL");
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
      updates.marketingSiteUrl = url;
    }

    if (updates.whatsappNumber !== undefined) {
      const number = String(updates.whatsappNumber).trim();
      const digits = number.replace(/[^0-9]/g, "");
      if (number && (digits.length < 8 || digits.length > 15)) {
        const error = new Error("whatsappNumber must contain between 8 and 15 digits");
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
      updates.whatsappNumber = number;
    }

    if (updates.email) {
      const { fromName, fromEmail, replyTo } = updates.email;
      if (fromEmail && !EMAIL_REGEX.test(fromEmail)) {
        const error = new Error(`Adresse "from" invalide: ${fromEmail}`);
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
      if (replyTo && !EMAIL_REGEX.test(replyTo)) {
        const error = new Error(`Adresse "reply-to" invalide: ${replyTo}`);
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
      updates.email = {
        fromName: fromName || "",
        fromEmail: fromEmail || "",
        replyTo: replyTo || "",
      };
    }

    const updated = await PlatformSettings.findByIdAndUpdate(
      existing._id,
      updates,
      { new: true, runValidators: true }
    );

    await AuditService.logAction({
      actorType: "platform_admin",
      module: "Platform Settings",
      action: "update",
      entityType: "platform_settings",
      entityId: updated._id,
      status: "success",
      severity: "medium",
      newValue: updates,
    });

    if (updates.email) {
      await AuditService.logAction({
        actorType: "platform_admin",
        module: "Platform Settings",
        action: "platform.email.settings.updated",
        entityType: "platform_settings",
        entityId: updated._id,
        status: "success",
        severity: "low",
        // Identity fields only  there is no password to ever leak here
        // (see MAIL-03: platform SMTP credentials never live in this model).
        newValue: { email: updates.email },
      });
    }

    return updated;
  }

  // Config-presence check only  never exposes the secret itself (MAIL-03).
  async getEmailHealth() {
    const config = await getPlatformSmtpConfig();
    const configured = !!(config.auth?.user && config.auth?.pass) || !!config.service;
    return {
      configured,
      source: config._sofiaConfigSource === "database" ? "database" : "environment",
    };
  }

  async sendTestEmail(to, actor = null) {
    if (!to || !EMAIL_REGEX.test(to)) {
      const error = new Error("Adresse e-mail de test invalide");
      error.name = "InvalidRecipientEmail";
      throw error;
    }

    const settings = await this.getSettings();
    const platformName = settings.platformName || "SofiaGen";

    await EmailService.send({
      to,
      channel: "platform",
      type: "transactional",
      from: settings.email?.fromEmail
        ? settings.email.fromName
          ? `"${settings.email.fromName}" <${settings.email.fromEmail}>`
          : settings.email.fromEmail
        : undefined,
      replyTo: settings.email?.replyTo || undefined,
      subject: `[TEST] Configuration SMTP plateforme  ${platformName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color:#1f2937;">Test de configuration SMTP plateforme</h2>
          <p style="color:#374151;">Cet e-mail confirme que le SMTP de la plateforme <strong>${platformName}</strong> fonctionne correctement.</p>
        </div>
      `,
    });

    await AuditService.logAction({
      actorType: "platform_admin",
      actorId: actor?._id || null,
      module: "Platform Settings",
      action: "platform.email.test",
      entityType: "platform_settings",
      entityId: settings._id,
      status: "success",
      severity: "low",
      newValue: { to },
    });

    return { sent: true };
  }

  async getPasswordPolicy() {
    const settings = await this.getSettings();
    return settings.passwordPolicy;
  }

  async updatePasswordPolicy(policy) {
    const settings = await this.getSettings();
    settings.passwordPolicy = { ...settings.passwordPolicy, ...policy };
    await settings.save();

    await AuditService.logAction({
      actorType: "platform_admin",
      module: "Platform Settings",
      action: "update_password_policy",
      entityType: "platform_settings",
      entityId: settings._id,
      status: "success",
      severity: "high",
      newValue: { passwordPolicy: settings.passwordPolicy },
    });

    return settings.passwordPolicy;
  }
}

module.exports = new PlatformSettingsService();
