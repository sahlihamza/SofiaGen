// Simple slugify helper (normalize, remove accents, keep alphanumerics and dashes)
const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toCamel = (s) => String(s || "").replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const normalizeFeaturesMap = (value) => {
  if (!value) return {};
  if (value instanceof Map) value = Object.fromEntries(value);
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [toCamel(k), Boolean(v)])
    );
  }
  return {};
};

const normalizeLimitsMap = (limits) => {
  if (!limits) return {};
  if (limits instanceof Map) limits = Object.fromEntries(limits);
  if (Array.isArray(limits)) return limits;
  if (typeof limits === "object") {
    const mapped = {};
    Object.entries(limits).forEach(([k, v]) => {
      if (k === "storage_mb") {
        // backend quota 'storage' expects GB; convert MB->GB
        mapped["storage"] = v === null || v === undefined ? null : Number((v / 1024).toFixed(2));
      } else if (k === "team_members" || k === "team_members_count") {
        // map frontend team member key to backend 'admins' quota code
        mapped["admins"] = v === null || v === undefined ? null : Number(v);
      } else {
        mapped[k] = v === null || v === undefined ? null : Number(v) || v;
      }
    });
    return mapped;
  }
  return {};
};

export const buildPlanPayload = (data = {}, strategy) => {
  const payload = {
    ...data,
    features: data?.features ? normalizeFeaturesMap(data.features) : {},
    limits: data?.limits ? normalizeLimitsMap(data.limits) : {},
    version: data?.version,
    versionNote: data?.versionNote || "",
    pricingHistory: data?.pricingHistory || [],
  };

  // Ensure slug is present: if missing, derive from name to satisfy backend validation
  if ((!payload.slug || String(payload.slug).trim() === "") && data?.name) {
    payload.slug = slugify(data.name);
  }

  if (strategy) payload.strategy = strategy;

  return payload;
};
