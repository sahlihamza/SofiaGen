const PlanTemplate = require("../models/PlanTemplate");
const Plan = require("../models/Plan");
const PlanFeature = require("../models/PlanFeature");
const PlanQuota = require("../models/PlanQuota");
const PlanAuditLog = require("../models/PlanAuditLog");
const PlanVersionService = require("./PlanVersionService");
const mongoose = require("mongoose");

/**
 * PlanTemplateService (P14)
 *
 * - list / get / create / update / delete / clone templates
 * - instantiate: create a real Plan from a template (with PlanFeature,
 *   PlanQuota, audit log and initial PlanVersion snapshot)
 */

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Convert a template blueprint into a legacy features/limits Map usable by Plan.
 */
const buildLegacyMaps = (template) => {
  const features = new Map();
  (template.features || []).forEach((f) => {
    features.set(f.code, f.enabled);
  });

  const limits = new Map();
  (template.quotas || []).forEach((q) => {
    limits.set(q.quotaTypeCode, q.isUnlimited ? null : q.limitValue);
  });

  return { features, limits };
};

/**
 * List templates with pagination + filters.
 */
const listTemplates = async ({ page = 1, limit = 20, search = "", status = "" } = {}) => {
  const skip = (page - 1) * limit;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;

  const total = await PlanTemplate.countDocuments(query);
  const docs = await PlanTemplate.find(query)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ displayOrder: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit, 10));

  return {
    data: docs,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
  };
};

const getTemplate = async (id) => {
  const doc = await PlanTemplate.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
  if (!doc) throw new Error("Plan template not found");
  return doc;
};

const createTemplate = async (payload, createdBy) => {
  const { name, slug, description, badge, color, icon, pricing, features, quotas, status, isDefault, displayOrder, visibility, notes } = payload;

  if (!name || !slug) throw new Error("Name and slug are required");

  const existing = await PlanTemplate.findOne({ slug: slugify(slug) });
  if (existing) throw new Error("Template slug already exists");

  const doc = await PlanTemplate.create({
    name,
    slug: slugify(slug),
    description,
    badge,
    color,
    icon,
    pricing: pricing || { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false, trialDays: 0 },
    features: features || [],
    quotas: quotas || [],
    status: status || "active",
    isDefault: isDefault || false,
    displayOrder: displayOrder || 0,
    visibility: visibility || "public",
    notes,
    createdBy,
  });

  return doc;
};

const updateTemplate = async (id, payload, updatedBy) => {
  const doc = await PlanTemplate.findById(id);
  if (!doc) throw new Error("Plan template not found");

  const { name, slug, description, badge, color, icon, pricing, features, quotas, status, isDefault, displayOrder, visibility, notes } = payload;

  if (name) doc.name = name;
  if (slug) {
    const newSlug = slugify(slug);
    const existing = await PlanTemplate.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existing) throw new Error("Template slug already exists");
    doc.slug = newSlug;
  }
  if (description !== undefined) doc.description = description;
  if (badge !== undefined) doc.badge = badge;
  if (color) doc.color = color;
  if (icon !== undefined) doc.icon = icon;
  if (pricing) doc.pricing = pricing;
  if (features) doc.features = features;
  if (quotas) doc.quotas = quotas;
  if (status) doc.status = status;
  if (isDefault !== undefined) doc.isDefault = isDefault;
  if (displayOrder !== undefined) doc.displayOrder = displayOrder;
  if (visibility) doc.visibility = visibility;
  if (notes !== undefined) doc.notes = notes;

  doc.updatedBy = updatedBy;
  await doc.save();
  return doc;
};

const deleteTemplate = async (id) => {
  const doc = await PlanTemplate.findByIdAndDelete(id);
  if (!doc) throw new Error("Plan template not found");
  return doc;
};

const cloneTemplate = async (id, { name, slug } = {}, createdBy) => {
  const source = await PlanTemplate.findById(id);
  if (!source) throw new Error("Plan template not found");

  const cloneName = name?.trim() || `${source.name} (Copy)`;
  let baseSlug = slug ? slugify(slug) : `${source.slug}-copy`;
  let uniqueSlug = baseSlug;
  let counter = 1;
  while (await PlanTemplate.findOne({ slug: uniqueSlug })) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  const doc = await PlanTemplate.create({
    name: cloneName,
    slug: uniqueSlug,
    description: source.description,
    badge: source.badge,
    color: source.color,
    icon: source.icon,
    pricing: source.pricing,
    features: source.features,
    quotas: source.quotas,
    status: "draft",
    isDefault: false,
    displayOrder: source.displayOrder,
    visibility: source.visibility,
    notes: `Cloned from ${source.name}`,
    createdBy,
  });

  return doc;
};

/**
 * Instantiate a real Plan from a template.
 * Creates Plan + PlanFeature + PlanQuota + audit log + initial PlanVersion.
 */
const instantiate = async ({ templateId, name, slug, createSnapshot = true, createdBy, ipAddress } = {}) => {
  const template = await PlanTemplate.findById(templateId);
  if (!template) throw new Error("Plan template not found");

  const planName = name?.trim() || template.name;
  let planSlug = slug ? slugify(slug) : slugify(template.slug);
  let uniqueSlug = planSlug;
  let counter = 1;
  while (await Plan.findOne({ slug: uniqueSlug })) {
    counter++;
    uniqueSlug = `${planSlug}-${counter}`;
  }

  const { features, limits } = buildLegacyMaps(template);

  // Create the Plan document
  const plan = await Plan.create({
    name: planName,
    slug: uniqueSlug,
    description: template.description,
    badge: template.badge,
    color: template.color,
    icon: template.icon,
    pricing: {
      monthly: template.pricing?.monthly,
      yearly: template.pricing?.yearly,
      currency: template.pricing?.currency || "USD",
      taxIncluded: template.pricing?.taxIncluded,
      trialDays: template.pricing?.trialDays || 0,
    },
    features,
    limits,
    status: "draft",
    isDefault: false,
    displayOrder: template.displayOrder,
    visibility: template.visibility === "internal" ? "private" : template.visibility,
    notes: template.notes,
    createdBy,
    version: 1,
  });

  // Create PlanFeature collection
  if (template.features && template.features.length > 0) {
    await PlanFeature.insertMany(
      template.features.map((f) => ({
        planId: plan._id,
        featureId: f.featureId || null,
        featureGroupId: f.featureGroupId || null,
        code: f.code,
        enabled: f.enabled,
        limit: f.limit ?? null,
        status: "active",
      }))
    );
  }

  // Create PlanQuota collection
  if (template.quotas && template.quotas.length > 0) {
    await PlanQuota.insertMany(
      template.quotas.map((q) => ({
        planId: plan._id,
        quotaTypeId: q.quotaTypeId || null,
        quotaTypeCode: q.quotaTypeCode,
        limitValue: q.limitValue ?? null,
        isUnlimited: q.isUnlimited,
        softWarningAt: q.softWarningAt ?? null,
        softCriticalAt: q.softCriticalAt ?? null,
        softBlockedAt: q.softBlockedAt ?? null,
      }))
    );
  }

  // Audit log
  await PlanAuditLog.create({
    planId: plan._id,
    action: "create",
    fieldChanges: { sourceTemplate: template.name, templateId: template._id },
    relatedEntity: "plan_template",
    userId: createdBy,
    ipAddress: ipAddress || null,
    summary: `Plan ${plan.name} instantiated from template ${template.name}`,
  });

  // Initial version snapshot
  if (createSnapshot !== false) {
    await PlanVersionService.createSnapshot(plan, {
      version: 1,
      source: "seeder",
      changeDescription: `Instantiated from template ${template.name}`,
      createdBy,
      ipAddress,
    });
  }

  // Increment template instantiate count
  template.instantiateCount = (template.instantiateCount || 0) + 1;
  await template.save();

  const populated = await Plan.findById(plan._id)
    .populate("createdBy", "name email");

  return populated;
};

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  instantiate,
  buildLegacyMaps,
};
