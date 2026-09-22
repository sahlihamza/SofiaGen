const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const PlanVersion = require("../models/PlanVersion");
const PlanPrice = require("../models/PlanPrice");
const Subscription = require("../models/Subscription");
const AuditService = require("./AuditService");
const { emitEvent } = require("../lib/eventBus");

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trial", "past_due", "pending", "suspended"];

const badRequest = (m, code = "BAD_REQUEST") => {
  const e = new Error(m);
  e.code = code;
  e.status = 400;
  return e;
};
const notFound = (m) => {
  const e = new Error(m);
  e.code = "NOT_FOUND";
  e.status = 404;
  return e;
};
const conflict = (m, code = "CONFLICT") => {
  const e = new Error(m);
  e.code = code;
  e.status = 409;
  return e;
};

const assertObjectId = (id, label) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) throw badRequest(`${label} invalide`);
  return id;
};

const audit = async ({ action, entityId, actorId, severity, summary, oldValue, newValue, metadata }) => {
  await AuditService.logAction({
    actorType: "platform_admin",
    actorId: actorId || null,
    module: "Platform Plan",
    action,
    summary,
    entityType: "plan",
    entityId,
    status: "success",
    severity,
    oldValue,
    newValue,
    metadata: metadata || {},
  });
};

const loadPlan = async (id, { allowDeleted = false } = {}) => {
  assertObjectId(id, "planId");
  const plan = await Plan.findById(id);
  if (!plan) throw notFound("Plan introuvable");
  if (plan.deletedAt && !allowDeleted) throw notFound("Plan introuvable");
  return plan;
};

const listPlans = async ({ status, category, search, page = 1, limit = 20, includeDeleted } = {}) => {
  const query = {};
  if (!includeDeleted || includeDeleted === "false") query.deletedAt = null;
  if (status) query.status = status;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));

  const [total, plans] = await Promise.all([
    Plan.countDocuments(query),
    Plan.find(query)
      .populate("currentVersionId", "version status publishedAt")
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
  ]);

  return {
    plans,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  };
};

const getPlan = async (id) => {
  const plan = await Plan.findOne({ _id: assertObjectId(id, "planId"), deletedAt: null }).populate(
    "currentVersionId"
  );
  if (!plan) throw notFound("Plan introuvable");

  const [versions, prices, activeSubscriptions] = await Promise.all([
    PlanVersion.find({ planId: plan._id }).select("version status publishedAt isImmutable createdAt").sort({ version: -1 }),
    PlanPrice.find({ planId: plan._id }),
    Subscription.countDocuments({ planId: plan._id, status: { $in: ACTIVE_SUBSCRIPTION_STATUSES } }),
  ]);

  return { plan, versions, prices, activeSubscriptions };
};

const IDENTITY_FIELDS = [
  "name",
  "slug",
  "code",
  "category",
  "description",
  "badge",
  "color",
  "icon",
  "status",
  "visibility",
  "isDefault",
  "displayOrder",
  "notes",
];

const FORBIDDEN_ON_UPDATE = ["pricing", "features", "limits", "pricingHistory", "version"];

const createPlan = async (payload = {}, actorId = null) => {
  const data = {};
  for (const f of IDENTITY_FIELDS) {
    if (payload[f] !== undefined) data[f] = payload[f];
  }
  if (!data.name) throw badRequest("name est obligatoire");
  if (!data.slug) throw badRequest("slug est obligatoire");
  data.status = data.status || "draft";
  data.createdBy = actorId;

  let plan;
  try {
    plan = await Plan.create(data);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "slug";
      throw conflict(`Un plan avec ce ${field} existe déjà`, "PLAN_DUPLICATE");
    }
    throw err;
  }

  await audit({
    action: "plan.create",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `Plan "${plan.name}" créé`,
    newValue: data,
  });

  return plan;
};

const updatePlan = async (id, payload = {}, actorId = null) => {
  const plan = await loadPlan(id);

  const rejected = FORBIDDEN_ON_UPDATE.filter((f) => payload[f] !== undefined);
  if (rejected.length > 0) {
    throw badRequest(
      `Ces champs ne sont pas modifiables ici : ${rejected.join(", ")}. Le tarif passe par PlanPrice, les features et quotas par PlanVersion.`,
      "PLAN_FIELD_NOT_EDITABLE"
    );
  }

  const updates = {};
  for (const f of IDENTITY_FIELDS) {
    if (payload[f] !== undefined) updates[f] = payload[f];
  }
  updates.updatedBy = actorId;

  let updated;
  try {
    updated = await Plan.findByIdAndUpdate(plan._id, { $set: updates }, { new: true, runValidators: true });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "slug";
      throw conflict(`Un plan avec ce ${field} existe déjà`, "PLAN_DUPLICATE");
    }
    throw err;
  }

  await audit({
    action: "plan.update",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `Plan "${updated.name}" mis à jour`,
    oldValue: IDENTITY_FIELDS.reduce((acc, f) => ({ ...acc, [f]: plan[f] }), {}),
    newValue: updates,
  });

  return updated;
};

const deletePlan = async (id, actorId = null) => {
  const plan = await loadPlan(id);

  const activeSubs = await Subscription.countDocuments({
    planId: plan._id,
    status: { $in: ACTIVE_SUBSCRIPTION_STATUSES },
  });

  if (activeSubs > 0) {
    throw conflict(
      `${activeSubs} abonnement(s) actif(s) référencent ce plan`,
      "PLAN_IN_USE"
    );
  }

  await Plan.findByIdAndUpdate(plan._id, {
    $set: { deletedAt: new Date(), status: "archived", updatedBy: actorId },
  });

  await audit({
    action: "plan.delete",
    entityId: plan._id,
    actorId,
    severity: "high",
    summary: `Plan "${plan.name}" archivé (soft-delete)`,
    oldValue: { status: plan.status, deletedAt: null },
    newValue: { status: "archived", deletedAt: new Date() },
  });

  emitEvent("plan.deleted", { entityId: plan._id, actorId, metadata: { name: plan.name } });

  return { planId: plan._id, deletedAt: new Date() };
};

const buildSnapshotFromPlan = (plan) => ({
  name: plan.name,
  slug: plan.slug,
  description: plan.description,
  badge: plan.badge,
  color: plan.color,
  icon: plan.icon,
  pricing: plan.pricing ? JSON.parse(JSON.stringify(plan.pricing)) : {},
  features: plan.features || new Map(),
  limits: plan.limits || new Map(),
  featureRefs: [],
  quotaRefs: [],
  status: plan.status,
  isDefault: plan.isDefault,
  displayOrder: plan.displayOrder,
  visibility: plan.visibility,
  notes: plan.notes,
});

const createVersion = async (planId, payload = {}, actorId = null) => {
  const plan = await loadPlan(planId);

  const latest = await PlanVersion.findOne({ planId: plan._id }).sort({ version: -1 });
  const nextVersion = latest ? latest.version + 1 : 1;

  const snapshot = latest
    ? JSON.parse(JSON.stringify(latest.snapshot))
    : buildSnapshotFromPlan(plan);

  if (Array.isArray(payload.featureRefs)) snapshot.featureRefs = payload.featureRefs;
  if (Array.isArray(payload.quotaRefs)) snapshot.quotaRefs = payload.quotaRefs;

  const version = await PlanVersion.create({
    planId: plan._id,
    version: nextVersion,
    snapshot,
    status: "draft",
    isImmutable: false,
    versionNote: payload.versionNote,
    changeDescription: payload.changeDescription,
    source: latest ? "clone" : "create",
    createdBy: actorId,
  });

  await audit({
    action: "plan.version_create",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `PlanVersion v${nextVersion} créé en draft pour "${plan.name}"`,
    metadata: { versionId: String(version._id), version: nextVersion, clonedFrom: latest ? latest.version : null },
  });

  return version;
};

const loadVersion = async (planId, versionId) => {
  assertObjectId(versionId, "versionId");
  const version = await PlanVersion.findOne({ _id: versionId, planId });
  if (!version) throw notFound("PlanVersion introuvable pour ce plan");
  return version;
};

const updateVersion = async (planId, versionId, payload = {}, actorId = null) => {
  const plan = await loadPlan(planId);
  const version = await loadVersion(plan._id, versionId);

  if (version.status !== "draft" || version.isImmutable) {
    throw conflict(
      `Seule une version en draft peut être édité (statut actuel : "${version.status}")`,
      "PLAN_VERSION_NOT_DRAFT"
    );
  }

  if (Array.isArray(payload.featureRefs)) version.snapshot.featureRefs = payload.featureRefs;
  if (Array.isArray(payload.quotaRefs)) version.snapshot.quotaRefs = payload.quotaRefs;
  if (payload.versionNote !== undefined) version.versionNote = payload.versionNote;
  if (payload.changeDescription !== undefined) version.changeDescription = payload.changeDescription;

  await version.save();

  await audit({
    action: "plan.version_update",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `PlanVersion v${version.version} modifiée (draft)`,
    metadata: { versionId: String(version._id) },
  });

  return version;
};

const getPublishImpact = async (planId) => {
  const plan = await loadPlan(planId);
  const [activeSubscriptions, byStatus] = await Promise.all([
    Subscription.countDocuments({ planId: plan._id, status: { $in: ACTIVE_SUBSCRIPTION_STATUSES } }),
    Subscription.aggregate([
      { $match: { planId: new mongoose.Types.ObjectId(String(plan._id)) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    planId: plan._id,
    planName: plan.name,
    activeSubscriptions,
    byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    note: "Publier une nouvelle version n'affecte aucune souscription existante : elles restent liés  leur planVersionId.",
  };
};

const publishVersion = async (planId, versionId, actorId = null) => {
  const plan = await loadPlan(planId);
  const version = await loadVersion(plan._id, versionId);

  if (version.status === "published") {
    throw conflict("Cette version est déjà publié", "PLAN_VERSION_ALREADY_PUBLISHED");
  }
  if (version.status === "archived") {
    throw conflict("Une version archivé ne peut pas être publié", "PLAN_VERSION_ARCHIVED");
  }

  const impact = await getPublishImpact(plan._id);
  const previousVersionId = plan.currentVersionId;

  version.status = "published";
  version.isImmutable = true;
  version.publishedAt = new Date();
  version.publishedBy = actorId;
  await version.save();

  if (previousVersionId && String(previousVersionId) !== String(version._id)) {
    await PlanVersion.updateOne({ _id: previousVersionId }, { $set: { status: "archived" } });
  }

  await Plan.findByIdAndUpdate(plan._id, {
    $set: { currentVersionId: version._id, version: version.version, updatedBy: actorId },
  });

  await audit({
    action: "plan.version_publish",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `PlanVersion v${version.version} publié pour "${plan.name}"`,
    oldValue: { currentVersionId: previousVersionId },
    newValue: { currentVersionId: version._id },
    metadata: {
      version: version.version,
      impactedStoresAtPublish: impact.activeSubscriptions,
    },
  });

  emitEvent("plan.version_published", {
    entityId: plan._id,
    actorId,
    metadata: { version: version.version, versionId: version._id },
  });

  return { version, impact };
};

const listPrices = async (planId) => {
  const plan = await loadPlan(planId);
  return PlanPrice.find({ planId: plan._id }).sort({ currency: 1, cycle: 1, effectiveFrom: -1 });
};

const createPrice = async (planId, payload = {}, actorId = null) => {
  const plan = await loadPlan(planId);

  const price = await PlanPrice.create({
    ...payload,
    planId: plan._id,
    createdBy: actorId,
  });

  await audit({
    action: "plan.price_create",
    entityId: plan._id,
    actorId,
    severity: "medium",
    summary: `Nouveau tarif ${price.currency}/${price.cycle} pour "${plan.name}"`,
    newValue: { priceId: price._id, currency: price.currency, cycle: price.cycle },
  });

  return price;
};

module.exports = {
  ACTIVE_SUBSCRIPTION_STATUSES,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  createVersion,
  updateVersion,
  publishVersion,
  getPublishImpact,
  listPrices,
  createPrice,
  IDENTITY_FIELDS,
  FORBIDDEN_ON_UPDATE,
};
