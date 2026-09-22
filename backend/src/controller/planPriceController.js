const mongoose = require("mongoose");
const PlanPrice = require("../models/PlanPrice");
const Plan = require("../models/Plan");
const PlanAuditLog = require("../models/PlanAuditLog");

const VALID_CYCLES = ["monthly", "quarterly", "semi_annual", "yearly", "custom"];
const VALID_STATUSES = ["draft", "active", "inactive", "archived"];

const createAuditLog = (planId, action, fieldChanges, userId, summary) => {
  return PlanAuditLog.create({
    planId,
    action,
    fieldChanges,
    userId,
    ipAddress: null,
    summary,
    relatedEntity: "plan_price",
  });
};

const parseSort = (sort) => {
  if (typeof sort !== "string") return { createdAt: -1 };
  if (sort.startsWith("-")) return { [sort.slice(1)]: -1 };
  if (sort.startsWith("+")) return { [sort.slice(1)]: 1 };
  return { [sort]: 1 };
};

// GET / -> list with pagination, search, filters
const getPlanPrices = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 20,
      planId,
      currency,
      cycle,
      status,
      search = "",
      sort = "-createdAt",
      isDefault,
    } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);

    const query = {};
    if (planId) query.planId = planId;
    if (currency) query.currency = currency.toUpperCase();
    if (cycle) query.cycle = cycle;
    if (status) query.status = status;
    if (isDefault !== undefined) query.isDefault = isDefault === "true";

    if (search) {
      query.$or = [
        { currency: { $regex: search, $options: "i" } },
        { cycleLabel: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const total = await PlanPrice.countDocuments(query);
    const prices = await PlanPrice.find(query)
      .populate("planId", "name slug color")
      .populate("createdBy", "name email")
      .sort(parseSort(sort))
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: prices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /:id
const getPlanPriceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: "Plan price not found" });
    }
    const price = await PlanPrice.findById(id)
      .populate("planId", "name slug")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    if (!price) {
      return res.status(404).json({ success: false, message: "Plan price not found" });
    }
    res.status(200).json({ success: true, data: price });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /
const createPlanPrice = async (req, res) => {
  try {
    const {
      planId,
      currency,
      cycle,
      cycleLabel,
      cycleDurationDays,
      price,
      setupFee,
      taxIncluded,
      taxRate,
      tiered,
      effectiveFrom,
      effectiveTo,
      status,
      isDefault,
      notes,
    } = req.body;

    // Validation
    if (!planId) return res.status(400).json({ success: false, message: "planId is required" });
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({ success: false, message: "Invalid planId" });
    }
    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    if (!currency) return res.status(400).json({ success: false, message: "currency is required" });
    if (!cycle || !VALID_CYCLES.includes(cycle)) {
      return res.status(400).json({ success: false, message: `cycle must be one of: ${VALID_CYCLES.join(", ")}` });
    }
    if (price === undefined || price === null || Number(price) < 0) {
      return res.status(400).json({ success: false, message: "price must be a non-negative number" });
    }
    if (cycle === "custom" && !cycleDurationDays) {
      return res.status(400).json({ success: false, message: "cycleDurationDays is required for custom cycles" });
    }

    // Validate tiered pricing
    if (tiered && tiered.enabled) {
      const tiers = tiered.tiers || [];
      if (tiers.length === 0) {
        return res.status(400).json({ success: false, message: "At least one tier is required when tiered pricing is enabled" });
      }
      for (const tier of tiers) {
        if (tier.amount === undefined || Number(tier.amount) < 0) {
          return res.status(400).json({ success: false, message: "Each tier must have a non-negative amount" });
        }
      }
    }

    // Ensure only one default per plan+currency+cycle
    const makeDefault = isDefault === true;
    if (makeDefault) {
      await PlanPrice.updateMany(
        { planId, currency: currency.toUpperCase(), cycle },
        { $set: { isDefault: false } }
      );
    }

    const newPrice = new PlanPrice({
      planId,
      priceVersion: 1,
      currency: currency.toUpperCase(),
      cycle,
      cycleLabel,
      cycleDurationDays,
      price: Number(price),
      setupFee: Number(setupFee || 0),
      taxIncluded: !!taxIncluded,
      taxRate: Number(taxRate || 0),
      tiered: tiered || { enabled: false, tiers: [] },
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      status: status || "draft",
      isDefault: makeDefault,
      notes,
      createdBy: req.user?._id,
    });

    await newPrice.save();

    await createAuditLog(
      planId,
      "create",
      { price: { new: newPrice.toObject() } },
      req.user?._id,
      `Plan price created (${currency} / ${cycle})`
    );

    const populated = await PlanPrice.findById(newPrice._id).populate("planId", "name slug");
    res.status(201).json({ success: true, message: "Plan price created successfully", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /:id
const updatePlanPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await PlanPrice.findById(id);
    if (!price) return res.status(404).json({ success: false, message: "Plan price not found" });

    const {
      currency, cycle, cycleLabel, cycleDurationDays, price: newPrice,
      setupFee, taxIncluded, taxRate, tiered, effectiveFrom, effectiveTo,
      status, isDefault, notes,
    } = req.body;

    const old = price.toObject();
    const fieldChanges = {};

    if (currency !== undefined) {
      if (!currency) return res.status(400).json({ success: false, message: "currency cannot be empty" });
      price.currency = currency.toUpperCase();
      fieldChanges.currency = { old: old.currency, new: price.currency };
    }
    if (cycle !== undefined) {
      if (!VALID_CYCLES.includes(cycle)) {
        return res.status(400).json({ success: false, message: "Invalid cycle" });
      }
      price.cycle = cycle;
      fieldChanges.cycle = { old: old.cycle, new: cycle };
    }
    if (cycleLabel !== undefined) { price.cycleLabel = cycleLabel; fieldChanges.cycleLabel = { old: old.cycleLabel, new: cycleLabel }; }
    if (cycleDurationDays !== undefined) {
      if (price.cycle === "custom" && !cycleDurationDays) {
        return res.status(400).json({ success: false, message: "cycleDurationDays required for custom cycle" });
      }
      price.cycleDurationDays = cycleDurationDays;
      fieldChanges.cycleDurationDays = { old: old.cycleDurationDays, new: cycleDurationDays };
    }
    if (newPrice !== undefined) {
      if (Number(newPrice) < 0) return res.status(400).json({ success: false, message: "price must be non-negative" });
      price.price = Number(newPrice);
      fieldChanges.price = { old: old.price, new: newPrice };
    }
    if (setupFee !== undefined) { price.setupFee = Number(setupFee); fieldChanges.setupFee = { old: old.setupFee, new: setupFee }; }
    if (taxIncluded !== undefined) { price.taxIncluded = !!taxIncluded; fieldChanges.taxIncluded = { old: old.taxIncluded, new: taxIncluded }; }
    if (taxRate !== undefined) {
      if (Number(taxRate) < 0 || Number(taxRate) > 1) return res.status(400).json({ success: false, message: "taxRate must be between 0 and 1" });
      price.taxRate = Number(taxRate);
      fieldChanges.taxRate = { old: old.taxRate, new: taxRate };
    }
    if (tiered !== undefined) {
      if (tiered.enabled && (!tiered.tiers || tiered.tiers.length === 0)) {
        return res.status(400).json({ success: false, message: "At least one tier required when tiered enabled" });
      }
      price.tiered = tiered;
      fieldChanges.tiered = { old: old.tiered, new: tiered };
    }
    if (effectiveFrom !== undefined) { price.effectiveFrom = new Date(effectiveFrom); fieldChanges.effectiveFrom = { old: old.effectiveFrom, new: effectiveFrom }; }
    if (effectiveTo !== undefined) { price.effectiveTo = effectiveTo ? new Date(effectiveTo) : undefined; fieldChanges.effectiveTo = { old: old.effectiveTo, new: effectiveTo }; }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
      price.status = status;
      fieldChanges.status = { old: old.status, new: status };
    }
    if (isDefault !== undefined) {
      if (isDefault === true) {
        await PlanPrice.updateMany(
          { planId: price.planId, currency: price.currency, cycle: price.cycle, _id: { $ne: price._id } },
          { $set: { isDefault: false } }
        );
      }
      price.isDefault = !!isDefault;
      fieldChanges.isDefault = { old: old.isDefault, new: isDefault };
    }
    if (notes !== undefined) { price.notes = notes; fieldChanges.notes = { old: old.notes, new: notes }; }

    price.updatedBy = req.user?._id;
    await price.save();

    await createAuditLog(
      price.planId,
      "update",
      fieldChanges,
      req.user?._id,
      `Plan price updated (${price.currency} / ${price.cycle})`
    );

    const populated = await PlanPrice.findById(price._id).populate("planId", "name slug");
    res.status(200).json({ success: true, message: "Plan price updated successfully", data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /:id/status
const updatePlanPriceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const price = await PlanPrice.findById(id);
    if (!price) return res.status(404).json({ success: false, message: "Plan price not found" });

    const oldStatus = price.status;
    price.status = status;
    price.updatedBy = req.user?._id;
    await price.save();

    await createAuditLog(
      price.planId,
      "update",
      { status: { old: oldStatus, new: status } },
      req.user?._id,
      `Plan price status changed to ${status}`
    );

    res.status(200).json({ success: true, message: "Plan price status updated", data: price });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /:id (soft delete: only draft can be hard-deleted)
const deletePlanPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const price = await PlanPrice.findById(id);
    if (!price) return res.status(404).json({ success: false, message: "Plan price not found" });

    if (price.status !== "draft") {
      price.status = "archived";
      price.updatedBy = req.user?._id;
      await price.save();
      await createAuditLog(price.planId, "archive", { status: { old: "active", new: "archived" } }, req.user?._id, "Plan price archived");
      return res.status(200).json({ success: true, message: "Plan price archived (only draft prices can be deleted)" });
    }

    await PlanPrice.findByIdAndDelete(id);
    await createAuditLog(price.planId, "delete", null, req.user?._id, "Plan price deleted");
    res.status(200).json({ success: true, message: "Plan price deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /active/for-plan/:planId -> all active prices for a given plan
const getActivePricesForPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const now = new Date();
    const prices = await PlanPrice.find({
      planId,
      status: "active",
      $or: [
        { effectiveFrom: { $lte: now }, effectiveTo: { $gte: now } },
        { effectiveFrom: { $lte: now }, effectiveTo: null },
      ],
    }).sort({ cycle: 1, currency: 1 });

    res.status(200).json({ success: true, data: prices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPlanPrices,
  getPlanPriceById,
  createPlanPrice,
  updatePlanPrice,
  updatePlanPriceStatus,
  deletePlanPrice,
  getActivePricesForPlan,
};
