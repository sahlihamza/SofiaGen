const MarketingSettings = require("../models/MarketingSettings");
const auditLogService = require("./auditLogService");
const metaCapi = require("./marketing/metaCapiService");
const axios = require("axios");

const DEFAULT_DOC = () => ({
  meta: { pixelEnabled: false, pixelId: "", capiEnabled: false, capiPixelId: "", domainVerificationCode: "" },
  google: { analyticsEnabled: false, measurementId: "", searchConsoleVerification: "" },
  sitemap: { enabled: true, includeProducts: true, includeCategories: true, customUrls: [] },
  consent: { requireAnalyticsConsent: false, requireMarketingConsent: true },
});

const sanitizeBody = (body = {}) => {
  const out = DEFAULT_DOC();
  if (body.meta && typeof body.meta === "object") {
    out.meta = {
      pixelEnabled: Boolean(body.meta.pixelEnabled),
      pixelId: typeof body.meta.pixelId === "string" ? body.meta.pixelId.trim() : "",
      capiEnabled: Boolean(body.meta.capiEnabled),
      capiPixelId: typeof body.meta.capiPixelId === "string" ? body.meta.capiPixelId.trim() : "",
      capiAccessToken:
        typeof body.meta.capiAccessToken === "string" && body.meta.capiAccessToken.length > 0
          ? body.meta.capiAccessToken
          : "",
      capiTestEventCode:
        typeof body.meta.capiTestEventCode === "string" ? body.meta.capiTestEventCode.trim() : "",
      domainVerificationCode:
        typeof body.meta.domainVerificationCode === "string"
          ? body.meta.domainVerificationCode.trim()
          : "",
    };
  }
  if (body.google && typeof body.google === "object") {
    out.google = {
      analyticsEnabled: Boolean(body.google.analyticsEnabled),
      measurementId: typeof body.google.measurementId === "string" ? body.google.measurementId.trim() : "",
      searchConsoleVerification:
        typeof body.google.searchConsoleVerification === "string"
          ? body.google.searchConsoleVerification.trim()
          : "",
    };
  }
  if (body.sitemap && typeof body.sitemap === "object") {
    out.sitemap = {
      enabled: body.sitemap.enabled !== undefined ? Boolean(body.sitemap.enabled) : true,
      includeProducts:
        body.sitemap.includeProducts !== undefined ? Boolean(body.sitemap.includeProducts) : true,
      includeCategories:
        body.sitemap.includeCategories !== undefined ? Boolean(body.sitemap.includeCategories) : true,
      customUrls: Array.isArray(body.sitemap.customUrls)
        ? body.sitemap.customUrls.map((u) => String(u).trim()).filter(Boolean)
        : [],
    };
  }
  if (body.consent && typeof body.consent === "object") {
    out.consent = {
      requireAnalyticsConsent: Boolean(body.consent.requireAnalyticsConsent),
      requireMarketingConsent: Boolean(body.consent.requireMarketingConsent),
    };
  }
  return out;
};

const diffChanges = (before, after) => {
  const changes = [];
  const paths = ["meta", "google", "sitemap", "consent"];
  for (const group of paths) {
    const a = before?.[group] || {};
    const b = after?.[group] || {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (k === "capiAccessToken") {
        changes.push({ path: `${group}.${k}`, action: a[k] ? "unchanged" : "updated" });
        continue;
      }
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
        changes.push({ path: `${group}.${k}`, before: a[k], after: b[k] });
      }
    }
  }
  return changes;
};

class MarketingSettingsService {
  async getByStoreId(storeId) {
    if (!storeId) throw new Error("storeId requis");
    let doc = await MarketingSettings.findOne({ storeId });
    if (!doc) {
      doc = await MarketingSettings.create({ storeId, ...DEFAULT_DOC() });
    }
    return doc;
  }

  async upsertByStoreId(storeId, body = {}, { actor = null, ipAddress = "" } = {}) {
    if (!storeId) throw new Error("storeId requis");
    const sanitized = sanitizeBody(body);
    const current = await this.getByStoreId(storeId);
    const before = current.toObject();

    current.set({
      ...before,
      meta: { ...before.meta?.toObject?.() || before.meta, ...sanitized.meta },
      google: { ...before.google?.toObject?.() || before.google, ...sanitized.google },
      sitemap: { ...before.sitemap?.toObject?.() || before.sitemap, ...sanitized.sitemap },
      consent: { ...before.consent?.toObject?.() || before.consent, ...sanitized.consent },
    });

    if (sanitized.meta.capiAccessToken) {
      current.meta.capiAccessToken = sanitized.meta.capiAccessToken;
    }
    if (!sanitized.meta.capiAccessToken && current.isModified("meta.capiAccessToken")) {
      current.meta.capiAccessToken = "";
    }

    await current.save();

    const changes = diffChanges(before, current.toObject());
    if (changes.length > 0) {
      await auditLogService.log({
        storeId,
        action: "marketing.settings.updated",
        entityType: "MarketingSettings",
        entityId: String(current._id),
        summary: `Paramètres marketing mis à jour (${changes.length} changement(s))`,
        metadata: { changes },
        actor,
        ipAddress,
      });
    }
    return current;
  }

  async getPublicForStore(storeId) {
    if (!storeId) return null;
    const doc = await MarketingSettings.findOne({ storeId }).select("+meta.capiAccessToken");
    if (!doc) return null;
    return doc.publicProjection();
  }

  async testMetaConnection(storeId, { actor = null, ipAddress = "" } = {}) {
    const doc = await this.getByStoreId(storeId);
    if (!doc.meta?.capiEnabled) {
      const err = new Error("Conversions API désactivé");
      err.name = "CapiDisabled";
      throw err;
    }
    const token = doc.getCapiAccessToken();
    const pixelId = doc.meta?.capiPixelId || doc.meta?.pixelId;
    if (!token || !pixelId) {
      const err = new Error("Pixel ID ou token manquant");
      err.name = "MissingCapiConfig";
      throw err;
    }
    const payload = metaCapi.buildPurchasePayload({
      eventId: `test_${Date.now()}`,
      pixelId,
      customData: { currency: "TND", value: 0 },
      user: {},
    });
    const result = await metaCapi.sendCapiEvent({
      pixelId,
      accessToken: token,
      payload,
      testEventCode: doc.meta?.capiTestEventCode || undefined,
    });
    doc.meta.lastTestAt = new Date();
    doc.meta.lastTestStatus = result.ok ? "ok" : "failed";
    doc.meta.lastTestMessage = result.ok ? "Connexion réussie" : (result.message || "échec");
    await doc.save();

    await auditLogService.log({
      storeId,
      action: result.ok ? "marketing.meta.capi.tested_ok" : "marketing.meta.capi.tested_failed",
      entityType: "MarketingSettings",
      entityId: String(doc._id),
      summary: result.ok ? "Test CAPI réussi" : "Test CAPI échoué",
      metadata: { status: result.status, message: doc.meta.lastTestMessage },
      actor,
      ipAddress,
    });

    return { ok: result.ok, message: doc.meta.lastTestMessage, status: result.status };
  }

  async testGa4Connection(storeId, { actor = null, ipAddress = "" } = {}) {
    const doc = await this.getByStoreId(storeId);
    if (!doc.google?.analyticsEnabled) {
      const err = new Error("Google Analytics désactivé");
      err.name = "Ga4Disabled";
      throw err;
    }
    const measurementId = doc.google?.measurementId;
    if (!measurementId) {
      const err = new Error("Measurement ID manquant");
      err.name = "MissingGa4Config";
      throw err;
    }
    const validationUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      measurementId
    )}&api_secret=__probe__`;
    let probeOk = false;
    try {
      await axios.post(validationUrl, {
        client_id: `probe.${Date.now()}`,
        events: [{ name: "probe", params: { engagement_time_msec: 1 } }],
      }, { timeout: 4000, validateStatus: () => true });
      probeOk = true;
    } catch (err) {
      probeOk = false;
    }

    const ok = /^G-[A-Z0-9]{4,12}$/.test(measurementId) && probeOk;
    const message = ok ? "Identifiant GA4 valide" : "Vérifiez le Measurement ID (format G-XXXXXXXX)";
    doc.google.lastTestAt = new Date();
    doc.google.lastTestStatus = ok ? "ok" : "failed";
    doc.google.lastTestMessage = message;
    await doc.save();

    await auditLogService.log({
      storeId,
      action: ok ? "marketing.ga4.tested_ok" : "marketing.ga4.tested_failed",
      entityType: "MarketingSettings",
      entityId: String(doc._id),
      summary: ok ? "Test GA4 réussi" : "Test GA4 échoué",
      metadata: { measurementId, message },
      actor,
      ipAddress,
    });

    return { ok, message };
  }
}

module.exports = new MarketingSettingsService();
module.exports.sanitizeBody = sanitizeBody;
module.exports.DEFAULT_DOC = DEFAULT_DOC;