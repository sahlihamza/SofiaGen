const mongoose = require("mongoose");
const Order = require("../models/Order");
const Customer = require("../models/Customer");

/**
 * OrderQueryService  store-scoped query helpers consumed by the AI tool
 * layer (and only by the AI tool layer for now). Centralising the
 * tenant filter here keeps `service/ai/` free of raw model imports and
 * means we have a single place to enforce the same multi-tenant rules
 * the rest of the app already uses.
 */

async function listRecentOrders({ storeId, status = null, limit = 10 }) {
  if (!storeId) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const pipeline = [
    {
      $lookup: { from: "customers", localField: "user", foreignField: "_id", as: "customer" },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $match: {
        "customer.storeId": new mongoose.Types.ObjectId(String(storeId)),
      },
    },
  ];
  if (status) pipeline.push({ $match: { status } });
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $limit: safeLimit });
  pipeline.push({
    $project: {
      _id: 1,
      invoice: 1,
      total: 1,
      status: 1,
      paymentMethod: 1,
      createdAt: 1,
      customerName: { $ifNull: ["$customer.firstName", ""] },
    },
  });
  return Order.aggregate(pipeline);
}

async function getOrderForStore({ storeId, orderId }) {
  if (!storeId || !orderId) return null;
  return Order.findOne({ _id: orderId, storeId }).lean();
}

async function countCustomers({ storeId, since = null }) {
  if (!storeId) return 0;
  const tenant = { storeId };
  if (since) tenant.createdAt = { $gte: since };
  return Customer.countDocuments(tenant);
}

async function searchCustomers({ storeId, query, limit = 10 }) {
  if (!storeId) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const re = String(query || "").trim();
  const filter = { storeId };
  if (re) {
    filter.$or = [
      { name: { $regex: re, $options: "i" } },
      { email: { $regex: re, $options: "i" } },
      { firstName: { $regex: re, $options: "i" } },
      { lastName: { $regex: re, $options: "i" } },
    ];
  }
  return Customer.find(filter)
    .select("name email firstName lastName createdAt")
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();
}

module.exports = {
  listRecentOrders,
  getOrderForStore,
  countCustomers,
  searchCustomers,
};