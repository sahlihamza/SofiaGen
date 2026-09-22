const AccountsPrivacySettings = require("../models/AccountsPrivacySettings");
const auditLogService = require("./auditLogService");
const { diffFields, formatDiffSummary } = require("../utils/auditDiff");
const { REQUIRED_FIELD_KEYS } = AccountsPrivacySettings;

class AccountsPrivacyService {
  async getByStoreId(storeId) {
    let settings = await AccountsPrivacySettings.findOne({ storeId });

    if (!settings) {
      try {
        settings = await AccountsPrivacySettings.create({ storeId });
      } catch (error) {
        if (error.code !== 11000) throw error;
        settings = await AccountsPrivacySettings.findOne({ storeId });
        if (!settings) throw error;
      }
    }

    return settings;
  }

  async upsertByStoreId(storeId, updates = {}, actor = null) {
    const {
      checkout,
      accountCreation,
      passwordPolicy,
      privacyPolicy,
      dataErasure,
      dataRetention,
    } = updates;
    this._validateUpdates({ accountCreation, passwordPolicy, dataRetention });

    // Number fields coming from an emptied <input type="number"> arrive as
    // "" rather than null  normalize so Mongoose doesn't try to cast an
    // empty string to a Number (which would throw a CastError).
    const normalizedRetention = dataRetention
      ? Object.fromEntries(
          Object.entries(dataRetention).map(([key, period]) => [
            key,
            period?.value === "" ? { ...period, value: null } : period,
          ])
        )
      : dataRetention;

    const current = await this.getByStoreId(storeId);

    const beforeState = {
      checkout: current.checkout?.toObject?.() || {},
      accountCreation: current.accountCreation?.toObject?.() || {},
      passwordPolicy: current.passwordPolicy?.toObject?.() || {},
      privacyPolicy: current.privacyPolicy?.toObject?.() || {},
      dataErasure: current.dataErasure?.toObject?.() || {},
      dataRetention: current.dataRetention?.toObject?.() || {},
    };

    const merged = {
      checkout: { ...beforeState.checkout, ...checkout },
      accountCreation: { ...beforeState.accountCreation, ...accountCreation },
      passwordPolicy: { ...beforeState.passwordPolicy, ...passwordPolicy },
      privacyPolicy: { ...beforeState.privacyPolicy, ...privacyPolicy },
      dataErasure: { ...beforeState.dataErasure, ...dataErasure },
      dataRetention: { ...beforeState.dataRetention, ...normalizedRetention },
    };

    const settings = await AccountsPrivacySettings.findOneAndUpdate(
      { storeId },
      { $set: merged, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const changes = diffFields(beforeState, merged);
    const isPolicyChange = changes.some(
      (c) => c.field.startsWith("passwordPolicy.") || c.field.startsWith("privacyPolicy.")
    );

    await auditLogService.log({
      storeId,
      action: isPolicyChange ? "policy_updated" : "settings_updated",
      entityType: "AccountsPrivacySettings",
      entityId: String(settings._id),
      summary: `Comptes et confidentialité : ${formatDiffSummary(changes)}`,
      metadata: { changes },
      actor,
    });

    return settings;
  }

  _validateUpdates({ accountCreation, passwordPolicy, dataRetention }) {
    if (accountCreation?.requiredFields) {
      const invalidField = accountCreation.requiredFields.find(
        (field) => !REQUIRED_FIELD_KEYS.includes(field)
      );
      if (invalidField) {
        const error = new Error(`Champ obligatoire inconnu: ${invalidField}`);
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
    }

    if (dataRetention) {
      const retentionKeys = [
        "inactiveAccounts",
        "pendingOrders",
        "failedOrders",
        "cancelledOrders",
        "refundedOrders",
        "completedOrders",
      ];
      for (const key of retentionKeys) {
        const period = dataRetention[key];
        if (!period) continue;

        if (
          period.value !== null &&
          period.value !== undefined &&
          period.value !== "" &&
          (isNaN(Number(period.value)) || Number(period.value) < 0)
        ) {
          const error = new Error(
            `La duré de conservation pour ${key} doit être un nombre positif ou vide (illimité)`
          );
          error.name = "ValidationError";
          error.errors = {};
          throw error;
        }

        if (
          period.unit &&
          !["days", "weeks", "months", "years"].includes(period.unit)
        ) {
          const error = new Error(`Unit de conservation invalide pour ${key}: ${period.unit}`);
          error.name = "ValidationError";
          error.errors = {};
          throw error;
        }
      }
    }

    if (!passwordPolicy) return;

    if (
      passwordPolicy.minLength !== undefined &&
      (isNaN(Number(passwordPolicy.minLength)) || Number(passwordPolicy.minLength) < 4)
    ) {
      const error = new Error(
        "La longueur minimale du mot de passe doit être d'au moins 4 caractères"
      );
      error.name = "ValidationError";
      error.errors = {};
      throw error;
    }

    const nonNegativeFields = [
      "passwordExpiryDays",
      "passwordHistoryCount",
      "maxLoginAttempts",
    ];
    for (const field of nonNegativeFields) {
      const value = passwordPolicy[field];
      if (value !== undefined && (isNaN(Number(value)) || Number(value) < 0)) {
        const error = new Error(`${field} doit être un nombre positif ou nul`);
        error.name = "ValidationError";
        error.errors = {};
        throw error;
      }
    }
  }
}

module.exports = new AccountsPrivacyService();
