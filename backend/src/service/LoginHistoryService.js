const LoginHistory = require("../models/LoginHistory");
const AuditService = require("./AuditService");

class LoginHistoryService {
  async recordLogin(data) {
    const {
      userId,
      ipAddress,
      userAgent,
      device,
      browser,
      os,
      country,
      city,
      sessionId,
      storeId,
      status = "success",
      failureReason,
      isAdminLogin = true,
    } = data;

    const entry = await LoginHistory.create({
      userId,
      ipAddress,
      userAgent,
      device,
      browser,
      os,
      country,
      city,
      sessionId,
      storeId,
      status,
      failureReason,
      isAdminLogin,
    });

    return entry;
  }

  async getAllLoginHistory(filters = {}, pagination = {}) {
    const {
      userId,
      ipAddress,
      status,
      country,
      browser,
      dateFrom,
      dateTo,
      search = "",
    } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};

    if (userId) query.userId = userId;
    if (ipAddress) query.ipAddress = ipAddress;
    if (status) query.status = Array.isArray(status) ? { $in: status } : status;
    if (country) query.country = country;
    if (browser) query.browser = browser;

    if (dateFrom || dateTo) {
      query.loginAt = {};
      if (dateFrom) query.loginAt.$gte = new Date(dateFrom);
      if (dateTo) query.loginAt.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { ipAddress: { $regex: search, $options: "i" } },
        { browser: { $regex: search, $options: "i" } },
        { os: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
        { device: { $regex: search, $options: "i" } },
      ];
    }

    const total = await LoginHistory.countDocuments(query);

    const entries = await LoginHistory.find(query)
      .populate("userId", "name email")
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      entries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUserLoginHistory(userId, filters = {}, pagination = {}) {
    const { status, dateFrom, dateTo } = filters;

    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 50;
    const skip = (page - 1) * limit;

    const query = { userId };

    if (status) query.status = Array.isArray(status) ? { $in: status } : status;

    if (dateFrom || dateTo) {
      query.loginAt = {};
      if (dateFrom) query.loginAt.$gte = new Date(dateFrom);
      if (dateTo) query.loginAt.$lte = new Date(dateTo);
    }

    const total = await LoginHistory.countDocuments(query);

    const entries = await LoginHistory.find(query)
      .sort({ loginAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      entries,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async logoutSession(userId, sessionId) {
    await LoginHistory.updateOne(
      { userId, sessionId },
      { $set: { logoutAt: new Date() }, $unset: { sessionId: "" } }
    );

    await AuditService.logAction({
      actorType: "platform_admin",
      module: "Platform User",
      action: "session_logout",
      entityType: "user",
      entityId: userId,
      status: "success",
      severity: "medium",
      newValue: { sessionId: sessionId || "[unknown]" },
    });
  }

  async getStats() {
    const [total, success, failed, blocked, today] = await Promise.all([
      LoginHistory.countDocuments(),
      LoginHistory.countDocuments({ status: "success" }),
      LoginHistory.countDocuments({ status: "failed" }),
      LoginHistory.countDocuments({ status: "blocked" }),
      LoginHistory.countDocuments({
        loginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    return { total, success, failed, blocked, today };
  }

  async cleanupOldLogs(olderThanDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const result = await LoginHistory.deleteMany({ loginAt: { $lt: cutoff } });
    return { deletedCount: result.deletedCount };
  }
}

module.exports = new LoginHistoryService();
