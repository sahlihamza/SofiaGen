const planController = require("./planController");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const AuditService = require("../service/AuditService");
const Permission = require("../models/Permission");

const getAllPlansExtended = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      isDefault,
      sort = "-createdAt",
    } = req.query;

    const skip = (page - 1) * limit;
    const queryObject = {};

    if (search) {
      queryObject.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      queryObject.status = status;
    }

    if (isDefault !== undefined) {
      queryObject.isDefault = isDefault === "true";
    }

    const sortObject = {};
    if (typeof sort === "string") {
      if (sort.startsWith("-")) {
        sortObject[sort.slice(1)] = -1;
      } else if (sort.startsWith("+")) {
        sortObject[sort.slice(1)] = 1;
      } else {
        sortObject[sort] = 1;
      }
    }

    const total = await Plan.countDocuments(queryObject);

    const plans = await Plan.find(queryObject)
      .populate("createdBy", "name email")
.populate("updatedBy", "name email")
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    const enrichedPlans = await Promise.all(
      plans.map(async (plan) => {
        const subscriptionCount = await Subscription.countDocuments({ planId: plan._id });

        return {
          ...plan.toObject({ flattenMaps: true }),
          subscriptionCount,
          pricingHistory: plan.pricingHistory || [],
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPlans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPlanUsageStats = async (req, res) => {
  try {
    const planId = req.params.planId;
    const Subscription = require("../models/Subscription");

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const subscriptions = await Subscription.find({ planId }).populate("storeId", "name");

    const byStatus = {};
    for (const sub of subscriptions) {
      byStatus[sub.status] = (byStatus[sub.status] || 0) + 1;
    }

    res.status(200).json({
      success: true,
      data: {
        planId: plan._id,
        planName: plan.name,
        totalSubscriptions: subscriptions.length,
        byStatus,
        stores: subscriptions.map((sub) => ({
          storeId: sub.storeId?._id,
          storeName: sub.storeId?.name,
          status: sub.status,
          billingCycle: sub.billingCycle,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllPermissions = async (req, res) => {
  try {
    const { scope, category } = req.query;
    const query = {};
    if (scope) query.scope = scope;
    if (category) query.category = category;

    const permissions = await Permission.find(query)
      .sort({ category: 1, module: 1, action: 1 });

    const byCategory = {};
    for (const perm of permissions) {
      const cat = perm.category || "General";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(perm);
    }

    res.status(200).json({
      success: true,
      data: permissions,
      grouped: byCategory,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  ...planController,
  getAllPlansExtended,
  getPlanUsageStats,
  getAllPermissions,
};
