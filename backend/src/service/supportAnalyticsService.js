const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const TicketMessage = require("../models/TicketMessage");
const User = require("../models/User");

const DEFAULT_RANGE_DAYS = 30;
const STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
const OPEN_STATUSES = ["open", "in_progress", "waiting_customer"];

// Same shape as the codebase's other period-over-period comparisons (see
// AnalyticsService.getDashboardMetrics' userGrowthDelta)  % change, with the
// "previous was zero" edge case treated as +100% growth rather than
// dividing by zero, and "still zero" as no change.
const computeDelta = (current, previous) => {
  if (previous > 0) return Math.round(((current - previous) / previous) * 10000) / 100;
  return current > 0 ? 100 : 0;
};

// startDate/endDate default to the last 30 days, like most of this project's
// analytics endpoints. The "previous period" is the same-length window
// immediately preceding startDate  used for comparePeriod deltas.
const resolveDateRange = ({ startDate, endDate }) => {
  let end = endDate ? new Date(endDate) : new Date();
  let start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    const error = new Error("Plage de dates invalide");
    error.code = "INVALID_DATE_RANGE";
    throw error;
  }

  const durationMs = end.getTime() - start.getTime();
  const previousEnd = new Date(start.getTime());
  const previousStart = new Date(start.getTime() - durationMs);

  return { start, end, previousStart, previousEnd, durationMs };
};

const buildMatch = ({ storeId, start, end, dateField = "createdAt" }) => {
  const match = { [dateField]: { $gte: start, $lte: end } };
  if (storeId) match.storeId = new mongoose.Types.ObjectId(storeId);
  return match;
};

class SupportAnalyticsService {
  // ------------------------------------------------------------------
  // getSupportSummary
  // ------------------------------------------------------------------

  async _summaryForRange({ storeId, start, end }) {
    const match = buildMatch({ storeId, start, end });

    const [result] = await SupportTicket.aggregate([
      { $match: match },
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          firstResponse: [
            { $match: { "sla.firstResponseAt": { $ne: null } } },
            {
              $group: {
                _id: null,
                avgMs: { $avg: { $subtract: ["$sla.firstResponseAt", "$createdAt"] } },
                count: { $sum: 1 },
              },
            },
          ],
          resolution: [
            { $match: { "sla.resolvedAt": { $ne: null } } },
            {
              $group: {
                _id: null,
                avgMs: { $avg: { $subtract: ["$sla.resolvedAt", "$createdAt"] } },
                count: { $sum: 1 },
              },
            },
          ],
          slaCompliance: [
            { $match: { "sla.resolvedAt": { $ne: null } } },
            {
              $group: {
                _id: null,
                compliant: {
                  $sum: {
                    $cond: [{ $lte: ["$sla.resolvedAt", "$sla.resolutionDeadline"] }, 1, 0],
                  },
                },
                total: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const row of result.byStatus) {
      if (row._id) byStatus[row._id] = row.count;
    }
    const totalTickets = Object.values(byStatus).reduce((sum, c) => sum + c, 0);

    const firstResponse = result.firstResponse[0] || { avgMs: null, count: 0 };
    const resolution = result.resolution[0] || { avgMs: null, count: 0 };
    const slaCompliance = result.slaCompliance[0] || { compliant: 0, total: 0 };
    const slaComplianceRate =
      slaCompliance.total > 0 ? Math.round((slaCompliance.compliant / slaCompliance.total) * 10000) / 100 : null;

    return {
      totalTickets,
      byStatus,
      avgFirstResponseTimeMs: firstResponse.avgMs != null ? Math.round(firstResponse.avgMs) : null,
      avgResolutionTimeMs: resolution.avgMs != null ? Math.round(resolution.avgMs) : null,
      slaComplianceRate,
    };
  }

  // Overdue is a point-in-time snapshot ("right now"), not something that
  // happened "during" a period  a % change vs. the previous period isn't a
  // meaningful comparison for it (unlike a count of tickets *created* or
  // *resolved* in a window), so it's reported without a delta, scoped by
  // storeId but not by date range.
  async _overdueNow(storeId) {
    const match = {
      status: { $in: OPEN_STATUSES },
      "sla.resolutionDeadline": { $lt: new Date() },
    };
    if (storeId) match.storeId = new mongoose.Types.ObjectId(storeId);
    return SupportTicket.countDocuments(match);
  }

  async getSupportSummary({ storeId, startDate, endDate, comparePeriod } = {}) {
    const { start, end, previousStart, previousEnd } = resolveDateRange({ startDate, endDate });

    const [current, overdueCount] = await Promise.all([
      this._summaryForRange({ storeId, start, end }),
      this._overdueNow(storeId),
    ]);

    let previous = null;
    if (comparePeriod) {
      previous = await this._summaryForRange({ storeId, start: previousStart, end: previousEnd });
    }

    const withDelta = (key) => ({
      value: current[key],
      delta: previous ? computeDelta(current[key] ?? 0, previous[key] ?? 0) : null,
    });

    return {
      period: { startDate: start, endDate: end },
      comparePeriod: comparePeriod ? { startDate: previousStart, endDate: previousEnd } : null,
      totalTickets: withDelta("totalTickets"),
      byStatus: current.byStatus,
      avgFirstResponseTimeMs: withDelta("avgFirstResponseTimeMs"),
      avgResolutionTimeMs: withDelta("avgResolutionTimeMs"),
      slaComplianceRate: withDelta("slaComplianceRate"),
      overdueCount: { value: overdueCount, delta: null },
    };
  }

  // ------------------------------------------------------------------
  // getSupportCsat
  // ------------------------------------------------------------------

  async getSupportCsat({ storeId, startDate, endDate } = {}) {
    const { start, end, durationMs } = resolveDateRange({ startDate, endDate });
    // TicketMessage.storeId is denormalized from the ticket (see
    // TicketMessage.js), so this never needs a $lookup/join into
    // SupportTicket just to filter by store.
    const match = { ...buildMatch({ storeId, start, end }), rating: { $in: ["up", "down"] } };

    // Ratings only ever land on agent messages (rateMessage rejects rating a
    // customer message  see ticketMessageService.js), so no authorType
    // filter is needed here beyond "has a rating at all".
    const [totals, evolutionRaw] = await Promise.all([
      TicketMessage.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            positive: { $sum: { $cond: [{ $eq: ["$rating", "up"] }, 1, 0] } },
          },
        },
      ]),
      // Weekly buckets for periods up to ~2 months, monthly beyond that 
      // same idea as the "interval" switch analyticsController expects for
      // sales analytics, just decided here from the period length since
      // this endpoint doesn't take its own interval param.
      TicketMessage.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateTrunc: {
                date: "$createdAt",
                unit: durationMs > 60 * 24 * 60 * 60 * 1000 ? "month" : "week",
              },
            },
            total: { $sum: 1 },
            positive: { $sum: { $cond: [{ $eq: ["$rating", "up"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalsRow = totals[0] || { total: 0, positive: 0 };
    const csatScore = totalsRow.total > 0 ? Math.round((totalsRow.positive / totalsRow.total) * 10000) / 100 : null;

    return {
      period: { startDate: start, endDate: end },
      csatScore,
      totalRatings: totalsRow.total,
      positiveRatings: totalsRow.positive,
      negativeRatings: totalsRow.total - totalsRow.positive,
      evolution: evolutionRaw.map((row) => ({
        date: row._id,
        csatScore: row.total > 0 ? Math.round((row.positive / row.total) * 10000) / 100 : null,
        total: row.total,
      })),
    };
  }

  // ------------------------------------------------------------------
  // getAgentPerformance
  // ------------------------------------------------------------------

  async getAgentPerformance({ storeId, startDate, endDate } = {}) {
    const { start, end } = resolveDateRange({ startDate, endDate });

    const resolvedMatch = {
      assignedTo: { $ne: null },
      "sla.resolvedAt": { $gte: start, $lte: end },
    };
    if (storeId) resolvedMatch.storeId = new mongoose.Types.ObjectId(storeId);

    // CSAT is computed from messages this specific agent personally sent
    // (TicketMessage.author), not from every message on tickets assigned to
    // them  more precise when a ticket changes hands mid-conversation.
    const csatMatch = {
      authorType: "agent",
      rating: { $in: ["up", "down"] },
      createdAt: { $gte: start, $lte: end },
    };
    if (storeId) csatMatch.storeId = new mongoose.Types.ObjectId(storeId);

    const [resolvedByAgent, csatByAgent] = await Promise.all([
      SupportTicket.aggregate([
        { $match: resolvedMatch },
        {
          $group: {
            _id: "$assignedTo",
            resolvedCount: { $sum: 1 },
            avgResolutionTimeMs: { $avg: { $subtract: ["$sla.resolvedAt", "$createdAt"] } },
          },
        },
      ]),
      TicketMessage.aggregate([
        { $match: csatMatch },
        {
          $group: {
            _id: "$author",
            total: { $sum: 1 },
            positive: { $sum: { $cond: [{ $eq: ["$rating", "up"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const agentIds = new Set([
      ...resolvedByAgent.map((r) => String(r._id)),
      ...csatByAgent.map((r) => String(r._id)),
    ]);
    const agents = await User.find({ _id: { $in: [...agentIds] } })
      .select("_id name email")
      .lean();
    const agentMap = Object.fromEntries(agents.map((a) => [String(a._id), a]));

    const resolvedMap = Object.fromEntries(resolvedByAgent.map((r) => [String(r._id), r]));
    const csatMap = Object.fromEntries(csatByAgent.map((r) => [String(r._id), r]));

    return {
      period: { startDate: start, endDate: end },
      agents: [...agentIds].map((agentId) => {
        const resolved = resolvedMap[agentId];
        const csat = csatMap[agentId];
        return {
          agentId,
          agentName: agentMap[agentId]?.name || agentMap[agentId]?.email || "Unknown",
          resolvedCount: resolved?.resolvedCount || 0,
          avgResolutionTimeMs: resolved ? Math.round(resolved.avgResolutionTimeMs) : null,
          csatScore: csat && csat.total > 0 ? Math.round((csat.positive / csat.total) * 10000) / 100 : null,
          totalRatings: csat?.total || 0,
        };
      }),
    };
  }
}

module.exports = new SupportAnalyticsService();
