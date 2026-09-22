const TaxSettings = require("../models/TaxSettings");
const { STANDARD_TAX_CLASS } = TaxSettings;
const auditLogService = require("./auditLogService");
const { diffFields, formatDiffSummary } = require("../utils/auditDiff");

const validationError = (message) => {
  const error = new Error(message);
  error.name = "ValidationError";
  error.errors = {};
  return error;
};

const CODE_OR_WILDCARD = /^(\*|[A-Za-z]{2})$/;
const POSTCODE_PATTERN = /^[A-Za-z0-9 -]*\*?$/;

const validateRate = (rate, index, knownTaxClasses) => {
  const where = `Taux #${index + 1}`;

  if (rate.taxClass && !knownTaxClasses.includes(rate.taxClass)) {
    throw validationError(`${where} : classe de taxe inconnue  ${rate.taxClass} `);
  }
  if (rate.rate === undefined || rate.rate === null || rate.rate === "") {
    throw validationError(`${where} : le taux (%) est requis`);
  }
  if (isNaN(Number(rate.rate)) || Number(rate.rate) < 0) {
    throw validationError(`${where} : le taux (%) doit être un nombre positif`);
  }
  if (!rate.name || !String(rate.name).trim()) {
    throw validationError(`${where} : le nom de la taxe est requis`);
  }
  if (rate.country && !CODE_OR_WILDCARD.test(rate.country)) {
    throw validationError(`${where} : code pays invalide  ${rate.country} `);
  }
  if (rate.state && !CODE_OR_WILDCARD.test(rate.state)) {
    throw validationError(`${where} : code d'état invalide  ${rate.state} `);
  }
  if (rate.postcode && !POSTCODE_PATTERN.test(rate.postcode)) {
    throw validationError(`${where} : code postal invalide  ${rate.postcode} `);
  }
  if (
    rate.priority !== undefined &&
    (isNaN(Number(rate.priority)) || Number(rate.priority) < 1)
  ) {
    throw validationError(`${where} : la priorité doit être un entier positif`);
  }
};

class TaxSettingsService {
  async getByStoreId(storeId) {
    let settings = await TaxSettings.findOne({ storeId });

    if (!settings) {
      try {
        settings = await TaxSettings.create({ storeId });
      } catch (error) {
        // Two requests racing to create a brand-new store's document.
        if (error.code !== 11000) throw error;
        settings = await TaxSettings.findOne({ storeId });
        if (!settings) throw error;
      }
    }

    return settings;
  }

  _knownTaxClasses(settings) {
    return [STANDARD_TAX_CLASS, ...(settings.additionalTaxClasses || [])];
  }

  async upsertOptions(storeId, updates = {}, actor = null) {
    const current = await this.getByStoreId(storeId);
    const before = current.options?.toObject?.() || current.options || {};
    const merged = { ...before, ...updates };

    if (
      merged.shippingTaxClass !== "inherit" &&
      !this._knownTaxClasses(current).includes(merged.shippingTaxClass)
    ) {
      throw validationError(
        `Classe de taxe pour l'expédition inconnue :  ${merged.shippingTaxClass} `
      );
    }

    const settings = await TaxSettings.findOneAndUpdate(
      { storeId },
      { $set: { options: merged }, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const changes = diffFields(before, merged);
    if (changes.length > 0) {
      await auditLogService.log({
        storeId,
        action: "settings_updated",
        entityType: "TaxSettings.options",
        entityId: String(settings._id),
        summary: `Options fiscales : ${formatDiffSummary(changes)}`,
        metadata: { changes },
        actor,
      });
    }

    return settings;
  }

  async upsertTaxClasses(storeId, classes = [], actor = null) {
    const trimmed = classes.map((name) => String(name).trim()).filter(Boolean);
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      throw validationError("Les classes de taxe doivent avoir des noms uniques");
    }
    if (trimmed.some((name) => name.toLowerCase() === STANDARD_TAX_CLASS)) {
      throw validationError('"standard" est rûrervé  la classe de taxe standard');
    }

    const current = await this.getByStoreId(storeId);
    const before = current.additionalTaxClasses || [];

    // Removing a class that still has rate rows would orphan them  make the
    // admin clear the rates first so nothing silently disappears.
    const removed = before.filter((name) => !trimmed.includes(name));
    if (removed.length > 0) {
      const stillHasRates = (current.rates || []).some((rate) =>
        removed.includes(rate.taxClass)
      );
      if (stillHasRates) {
        throw validationError(
          `Supprimez d'abord les taux associés  : ${removed.join(", ")}`
        );
      }
    }

    const settings = await TaxSettings.findOneAndUpdate(
      { storeId },
      { $set: { additionalTaxClasses: trimmed }, $setOnInsert: { storeId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (JSON.stringify(before) !== JSON.stringify(trimmed)) {
      await auditLogService.log({
        storeId,
        action: "settings_updated",
        entityType: "TaxSettings.additionalTaxClasses",
        entityId: String(settings._id),
        summary: `Classes de taxe supplémentaires : ${before.join(", ") || "aucune"}  ${trimmed.join(", ") || "aucune"}`,
        metadata: { before, after: trimmed },
        actor,
      });
    }

    return settings;
  }

  async replaceRates(storeId, taxClass, rates = [], actor = null) {
    const current = await this.getByStoreId(storeId);
    const knownTaxClasses = this._knownTaxClasses(current);

    if (!knownTaxClasses.includes(taxClass)) {
      throw validationError(`Classe de taxe inconnue :  ${taxClass} `);
    }

    rates.forEach((rate, index) => validateRate(rate, index, knownTaxClasses));

    const normalizedNewRates = rates.map((rate) => ({
      taxClass,
      country: rate.country || "",
      state: rate.state || "",
      postcode: rate.postcode || "",
      city: rate.city || "",
      rate: Number(rate.rate),
      name: rate.name.trim(),
      priority: rate.priority ? Number(rate.priority) : 1,
      compound: !!rate.compound,
      shipping: rate.shipping !== false,
    }));

    const before = (current.rates || [])
      .filter((rate) => rate.taxClass === taxClass)
      .map((rate) => rate.toObject());
    const otherClassesRates = (current.rates || []).filter(
      (rate) => rate.taxClass !== taxClass
    );

    const settings = await TaxSettings.findOneAndUpdate(
      { storeId },
      {
        $set: { rates: [...otherClassesRates, ...normalizedNewRates] },
        $setOnInsert: { storeId },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await auditLogService.log({
      storeId,
      action: "settings_updated",
      entityType: "TaxSettings.rates",
      entityId: String(settings._id),
      summary: `Taux d'imposition (${taxClass}) : ${before.length}  ${normalizedNewRates.length} règle(s)`,
      metadata: { taxClass, before, after: normalizedNewRates },
      actor,
    });

    return settings;
  }

  resolveTaxForAddress(settings, { country = "", state = "", postcode = "", city = "" } = {}, taxClass = STANDARD_TAX_CLASS) {
    const norm = (value) => String(value || "").toUpperCase();
    const address = {
      country: norm(country),
      state: norm(state),
      postcode: String(postcode || "").toUpperCase(),
      city: norm(city),
    };

    const matches = (rate) => {
      if (rate.country && rate.country !== "*" && rate.country !== address.country) {
        return false;
      }
      if (rate.state && rate.state !== "*" && rate.state !== address.state) {
        return false;
      }
      if (rate.city && norm(rate.city) !== address.city) {
        return false;
      }
      if (rate.postcode) {
        const pattern = String(rate.postcode).toUpperCase();
        if (pattern.endsWith("*")) {
          if (!address.postcode.startsWith(pattern.slice(0, -1))) return false;
        } else if (pattern !== address.postcode) {
          return false;
        }
      }
      return true;
    };

    const candidates = (settings.rates || []).filter(
      (rate) => rate.taxClass === taxClass && matches(rate)
    );

    const byPriority = new Map();
    for (const rate of candidates) {
      const list = byPriority.get(rate.priority) || [];
      list.push(rate);
      byPriority.set(rate.priority, list);
    }

    const applied = [];
    for (const priority of [...byPriority.keys()].sort((a, b) => a - b)) {
      // First matching rule at this priority wins, same as WooCommerce.
      applied.push(byPriority.get(priority)[0]);
    }

    return applied;
  }
  calculateTax(subtotal, appliedRates) {
    let runningTotal = Number(subtotal) || 0;
    let totalTax = 0;
    const breakdown = [];

    const nonCompound = appliedRates.filter((rate) => !rate.compound);
    const compound = appliedRates.filter((rate) => rate.compound);

    for (const rate of nonCompound) {
      const amount = (Number(subtotal) * Number(rate.rate)) / 100;
      breakdown.push({ name: rate.name, rate: rate.rate, amount });
      totalTax += amount;
    }
    runningTotal = Number(subtotal) + totalTax;

    for (const rate of compound) {
      const amount = (runningTotal * Number(rate.rate)) / 100;
      breakdown.push({ name: rate.name, rate: rate.rate, amount });
      totalTax += amount;
      runningTotal += amount;
    }

    return { totalTax, breakdown };
  }
}

module.exports = new TaxSettingsService();
