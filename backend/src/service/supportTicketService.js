const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const Customer = require("../models/Customer");
const User = require("../models/User");

const TICKET_NUMBER_CHARS = "0123456789";
const TICKET_NUMBER_LENGTH = 6;

// SLA convention for SUPPORT-1, revised per the fuller SFG-80 spec: each
// priority now has its own first-response deadline in addition to the
// resolution deadline (previously a single flat slaDeadline).
const SLA_HOURS_BY_PRIORITY = {
  critical: { firstResponse: 1, resolution: 4 },
  high: { firstResponse: 4, resolution: 12 },
  normal: { firstResponse: 24, resolution: 48 },
  low: { firstResponse: 48, resolution: 120 },
};

const PRIORITY_WEIGHT = { critical: 4, high: 3, normal: 2, low: 1 };

// SUPPORT-2: linear happy path is open -> in_progress -> waiting_customer ->
// resolved -> closed, but real support work isn't strictly linear. The two
// backward edges below are deliberate, not oversights:
//  - waiting_customer -> in_progress: the customer replied, the agent resumes
//    active work on the ticket.
//  - resolved -> in_progress: the customer (or an agent) finds the fix
//    incomplete and the ticket needs more work before it can close.
// in_progress -> resolved is allowed directly (skipping waiting_customer)
// because plenty of tickets never need a round-trip with the customer.
// Every other jump (e.g. open -> resolved, anything -> open, out of closed)
// is rejected  closed is intentionally terminal.
const ALLOWED_STATUS_TRANSITIONS = {
  open: ["in_progress"],
  in_progress: ["waiting_customer", "resolved"],
  waiting_customer: ["in_progress", "resolved"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

const VALID_STATUSES = Object.keys(ALLOWED_STATUS_TRANSITIONS);
const VALID_PRIORITIES = Object.keys(PRIORITY_WEIGHT);
const SLA_WARNING_WINDOW_MS = 2 * 60 * 60 * 1000;
const BULK_ACTIONS = ["assign", "priority", "tag"];

const randomTicketSuffix = () => {
  let suffix = "";
  for (let i = 0; i < TICKET_NUMBER_LENGTH; i++) {
    suffix += TICKET_NUMBER_CHARS[Math.floor(Math.random() * TICKET_NUMBER_CHARS.length)];
  }
  return suffix;
};

class SupportTicketService {
  // Retries on collision rather than trusting randomness alone  the unique
  // { storeId, ticketNumber } index (SupportTicket.js) is the actual guarantee.
  async generateTicketNumber(storeId) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const ticketNumber = `SUP-${randomTicketSuffix()}`;
      const existing = await SupportTicket.findOne({ storeId, ticketNumber });
      if (!existing) return ticketNumber;
    }
    const error = new Error("Impossible de générer un numéro de ticket unique");
    error.code = "TICKET_NUMBER_GENERATION_FAILED";
    throw error;
  }

  computeSla(priority) {
    const hours = SLA_HOURS_BY_PRIORITY[priority] ?? SLA_HOURS_BY_PRIORITY.normal;
    const now = Date.now();
    return {
      firstResponseDeadline: new Date(now + hours.firstResponse * 60 * 60 * 1000),
      resolutionDeadline: new Date(now + hours.resolution * 60 * 60 * 1000),
      firstResponseAt: null,
      resolvedAt: null,
      status: "ok",
    };
  }

  // Never persisted as the source of truth  recomputed from
  // sla.resolutionDeadline/status on every read (see the "Not authoritative"
  // comment on SupportTicket.sla.status). Resolved/closed tickets are
  // excluded from the clock: once the work is done, a ticket sitting past
  // its original deadline isn't "overdue".
  computeSlaStatus(ticket) {
    if (["resolved", "closed"].includes(ticket.status)) return "ok";

    const resolutionDeadline = ticket.sla?.resolutionDeadline;
    if (!resolutionDeadline) return "ok";

    const remainingMs = new Date(resolutionDeadline).getTime() - Date.now();
    if (remainingMs < 0) return "overdue";
    if (remainingMs <= SLA_WARNING_WINDOW_MS) return "warning";
    return "ok";
  }

  async createTicket(data) {
    const subject = String(data.subject || "").trim();
    if (subject.length < 10) {
      const error = new Error("Le sujet doit contenir au moins 10 caractères");
      error.code = "SUBJECT_TOO_SHORT";
      throw error;
    }

    const description = String(data.description || "").trim();
    if (description.length < 50) {
      const error = new Error("La description doit contenir au moins 50 caractères");
      error.code = "DESCRIPTION_TOO_SHORT";
      throw error;
    }

    if (!data.storeId) {
      const error = new Error("storeId est requis");
      error.code = "STORE_ID_REQUIRED";
      throw error;
    }

    if (!data.createdByType || !data.createdBy) {
      const error = new Error("createdByType et createdBy sont requis");
      error.code = "CREATOR_REQUIRED";
      throw error;
    }

    const priority = data.priority || "normal";
    const ticketNumber = await this.generateTicketNumber(data.storeId);

    const ticket = new SupportTicket({
      storeId: data.storeId,
      ticketNumber,
      subject,
      description,
      categoryId: data.categoryId || null,
      priority,
      status: "open",
      createdByType: data.createdByType,
      createdBy: data.createdBy,
      customerId: data.customerId || null,
      source: data.source || "web",
      attachments: data.attachments || [],
      tags: data.tags || [],
      sla: this.computeSla(priority),
    });

    return await ticket.save();
  }

  async getTicketById(id, storeId) {
    return await SupportTicket.findOne({ _id: id, storeId });
  }

  // Resolves a free-text search into the set of creator ids it could match:
  // ticketNumber is matched directly on the ticket, while a name/email match
  // has to be looked up across both creator collections first since
  // createdBy has no fixed `ref` (see SupportTicket.js).
  async _buildSearchOrClause(storeId, search) {
    const term = String(search).trim();
    if (!term) return null;

    const regex = { $regex: term, $options: "i" };
    const orClause = [{ ticketNumber: regex }];

    const customerFilter = storeId ? { storeId, email: regex } : { email: regex };
    const [matchingCustomers, matchingUsers] = await Promise.all([
      Customer.find(customerFilter, { _id: 1 }).lean(),
      User.find({ email: regex }, { _id: 1 }).lean(),
    ]);

    if (matchingCustomers.length) {
      orClause.push({
        createdByType: "customer",
        createdBy: { $in: matchingCustomers.map((c) => c._id) },
      });
    }
    if (matchingUsers.length) {
      orClause.push({
        createdByType: "merchant",
        createdBy: { $in: matchingUsers.map((u) => u._id) },
      });
    }

    return orClause;
  }

  async getAllTickets({
    storeId,
    page,
    limit,
    status,
    priority,
    categoryId,
    assigneeId,
    dateFrom,
    dateTo,
    sortBy,
    search,
  } = {}) {
    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const queryObject = {};
    if (storeId) queryObject.storeId = new mongoose.Types.ObjectId(storeId);

    if (status) queryObject.status = status;
    if (priority) queryObject.priority = priority;
    if (categoryId) queryObject.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (assigneeId) queryObject.assignedTo = new mongoose.Types.ObjectId(assigneeId);

    if (dateFrom || dateTo) {
      queryObject.createdAt = {};
      if (dateFrom) queryObject.createdAt.$gte = new Date(dateFrom);
      if (dateTo) queryObject.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      const orClause = await this._buildSearchOrClause(storeId, search);
      if (orClause) queryObject.$or = orClause;
    }

    // priority has no natural alphabetical order (critical should outrank
    // low), so it needs a computed weight to sort on; createdAt and
    // sla.resolutionDeadline sort fine as plain date fields.
    const sortStage =
      sortBy === "priority"
        ? { priorityWeight: -1 }
        : sortBy === "sla.resolutionDeadline"
          ? { "sla.resolutionDeadline": 1 }
          : { createdAt: -1 };

    const [result] = await SupportTicket.aggregate([
      { $match: queryObject },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "critical"] }, then: PRIORITY_WEIGHT.critical },
                { case: { $eq: ["$priority", "high"] }, then: PRIORITY_WEIGHT.high },
                { case: { $eq: ["$priority", "normal"] }, then: PRIORITY_WEIGHT.normal },
                { case: { $eq: ["$priority", "low"] }, then: PRIORITY_WEIGHT.low },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limits },
            { $project: { priorityWeight: 0 } },
            // categoryId has a real `ref` (unlike createdBy/assignedTo,
            // polymorphic  see _attachNames below), so a $lookup covers it
            // directly instead of a separate batched query.
            {
              $lookup: {
                from: "ticketcategories",
                localField: "categoryId",
                foreignField: "_id",
                as: "_category",
              },
            },
            {
              $addFields: {
                categoryName: { $arrayElemAt: ["$_category.name", 0] },
              },
            },
            { $project: { _category: 0 } },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const withSlaStatus = (result?.data || []).map((ticket) => ({
      ...ticket,
      slaStatus: this.computeSlaStatus(ticket),
    }));
    const tickets = await this._attachNames(withSlaStatus);
    const totalDoc = result?.totalCount?.[0]?.count || 0;

    return { tickets, totalDoc, limits, pages };
  }

  // Frontend dashboard (SFG-80 agent dashboard) needs a human name for the
  // creator and assignee columns, not a bare ObjectId  createdBy has no
  // fixed `ref` (polymorphic, see SupportTicket.js) so Mongoose can't
  // populate it automatically. Batches one Customer + one User lookup for
  // the whole page of results rather than a query per ticket.
  async _attachNames(tickets) {
    const customerIds = new Set();
    const userIds = new Set();

    for (const ticket of tickets) {
      if (ticket.createdByType === "customer") customerIds.add(String(ticket.createdBy));
      else if (ticket.createdByType === "merchant") userIds.add(String(ticket.createdBy));
      if (ticket.assignedTo) userIds.add(String(ticket.assignedTo));
    }

    const [customers, users] = await Promise.all([
      customerIds.size
        ? Customer.find({ _id: { $in: [...customerIds] } }, { firstName: 1, lastName: 1, email: 1 }).lean()
        : [],
      userIds.size ? User.find({ _id: { $in: [...userIds] } }, { name: 1, email: 1 }).lean() : [],
    ]);

    const customerMap = Object.fromEntries(customers.map((c) => [String(c._id), c]));
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    return tickets.map((ticket) => {
      const creator =
        ticket.createdByType === "customer"
          ? customerMap[String(ticket.createdBy)]
          : userMap[String(ticket.createdBy)];
      const assignee = ticket.assignedTo ? userMap[String(ticket.assignedTo)] : null;

      return {
        ...ticket,
        creatorName: creator
          ? creator.name || [creator.firstName, creator.lastName].filter(Boolean).join(" ") || null
          : null,
        creatorEmail: creator?.email || null,
        assigneeName: assignee?.name || null,
        assigneeEmail: assignee?.email || null,
      };
    });
  }

  // Exposed for other services (e.g. ticketMessageService, SUPPORT-3) that
  // need to check whether an automatic status transition is legal without
  // duplicating the transition graph above.
  canTransitionTo(currentStatus, newStatus) {
    return (ALLOWED_STATUS_TRANSITIONS[currentStatus] || []).includes(newStatus);
  }

  async assignTicket(ticketId, agentId, storeId) {
    return await SupportTicket.findOneAndUpdate(
      { _id: ticketId, storeId },
      { $set: { assignedTo: agentId } },
      { new: true }
    );
  }

  async changeTicketStatus(ticketId, newStatus, storeId) {
    if (!VALID_STATUSES.includes(newStatus)) {
      const error = new Error(`Statut invalide : ${newStatus}`);
      error.code = "INVALID_STATUS";
      throw error;
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, storeId });
    if (!ticket) return null;

    if (ticket.status === newStatus) {
      const error = new Error(`Le ticket est déjà au statut ${newStatus}`);
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }

    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[ticket.status] || [];
    if (!allowedNextStatuses.includes(newStatus)) {
      const error = new Error(
        `Transition de statut invalide : ${ticket.status}  ${newStatus}`
      );
      error.code = "INVALID_STATUS_TRANSITION";
      throw error;
    }

    ticket.status = newStatus;
    if (newStatus === "resolved") ticket.sla.resolvedAt = new Date();

    return await ticket.save();
  }

  async bulkAction({ ticketIds, action, value, storeId }) {
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      const error = new Error("ticketIds est requis et doit être un tableau non vide");
      error.code = "TICKET_IDS_REQUIRED";
      throw error;
    }

    if (!BULK_ACTIONS.includes(action)) {
      const error = new Error(`Action groupé invalide : ${action}`);
      error.code = "INVALID_BULK_ACTION";
      throw error;
    }

    let update;
    if (action === "assign") {
      update = { $set: { assignedTo: value || null } };
    } else if (action === "priority") {
      if (!VALID_PRIORITIES.includes(value)) {
        const error = new Error(`Priorité invalide : ${value}`);
        error.code = "INVALID_PRIORITY_VALUE";
        throw error;
      }
      update = { $set: { priority: value } };
    } else if (action === "tag") {
      update = { $addToSet: { tags: value } };
    }

    const result = await SupportTicket.updateMany(
      { _id: { $in: ticketIds }, storeId },
      update
    );

    return {
      matchedCount: result.matchedCount ?? result.n ?? 0,
      modifiedCount: result.modifiedCount ?? result.nModified ?? 0,
    };
  }
}

module.exports = new SupportTicketService();
// Exposed so slaEscalationJob.js (SFG-80 Phase 4) uses the exact same
// warning window rather than a second hardcoded "2 hours" elsewhere.
module.exports.SLA_WARNING_WINDOW_MS = SLA_WARNING_WINDOW_MS;
