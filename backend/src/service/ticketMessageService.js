const SupportTicket = require("../models/SupportTicket");
const TicketMessage = require("../models/TicketMessage");
const Customer = require("../models/Customer");
const User = require("../models/User");
const supportTicketService = require("./supportTicketService");
const { emitEvent } = require("../lib/eventBus");

class TicketMessageService {
  // requesterType gates isInternalNote visibility  a customer must never
  // see internal agent notes, so the filter is applied at the query level
  // (not just left to the caller to strip client-side).
  async getTicketDetail(ticketId, storeId, requesterType) {
    const ticket = await SupportTicket.findOne({ _id: ticketId, storeId }).lean();
    if (!ticket) return null;

    const messageQuery = { ticket: ticketId, storeId };
    if (requesterType === "customer") {
      messageQuery.isInternalNote = false;
    }

    const rawMessages = await TicketMessage.find(messageQuery).sort({ createdAt: 1 }).lean();

    // Same creatorName/assigneeName/categoryName/slaStatus enrichment as
    // supportTicketService.getAllTickets (SFG-80 agent dashboard)  the
    // detail page needs it just as much as the list, and createdBy has no
    // fixed `ref` (polymorphic) so it can't come from a plain populate().
    ticket.slaStatus = supportTicketService.computeSlaStatus(ticket);
    const [[enrichedTicket], messages] = await Promise.all([
      supportTicketService._attachNames([ticket]),
      this._attachAuthorNames(rawMessages),
    ]);

    return { ticket: enrichedTicket, messages };
  }

  // Mirrors supportTicketService._attachNames  TicketMessage.author is the
  // same createdBy-style polymorphic reference (customer or agent depending
  // on authorType), so the thread needs the same batched Customer/User
  // lookup to show a name instead of a bare ObjectId per message.
  async _attachAuthorNames(messages) {
    const customerIds = new Set();
    const userIds = new Set();

    for (const message of messages) {
      if (message.authorType === "customer") customerIds.add(String(message.author));
      else userIds.add(String(message.author));
    }

    const [customers, users] = await Promise.all([
      customerIds.size
        ? Customer.find({ _id: { $in: [...customerIds] } }, { firstName: 1, lastName: 1, email: 1 }).lean()
        : [],
      userIds.size ? User.find({ _id: { $in: [...userIds] } }, { name: 1, email: 1 }).lean() : [],
    ]);

    const customerMap = Object.fromEntries(customers.map((c) => [String(c._id), c]));
    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    return messages.map((message) => {
      const author =
        message.authorType === "customer" ? customerMap[String(message.author)] : userMap[String(message.author)];

      return {
        ...message,
        authorName: author
          ? author.name || [author.firstName, author.lastName].filter(Boolean).join(" ") || null
          : null,
        authorEmail: author?.email || null,
      };
    });
  }

  async addMessage(ticketId, { content, isInternalNote, isSolution }, authorId, authorType, storeId) {
    const trimmedContent = String(content || "").trim();
    if (!trimmedContent) {
      const error = new Error("Le contenu du message est obligatoire");
      error.code = "CONTENT_REQUIRED";
      throw error;
    }

    if (isInternalNote && authorType !== "agent") {
      const error = new Error("Seul un agent peut ajouter une note interne");
      error.code = "INTERNAL_NOTE_FORBIDDEN";
      throw error;
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, storeId });
    if (!ticket) return null;

    const message = await TicketMessage.create({
      ticket: ticketId,
      storeId,
      authorType,
      author: authorId,
      content: trimmedContent,
      isInternalNote: !!isInternalNote,
      isSolution: !!isSolution,
    });

    // Automatic status transitions triggered by the conversation itself 
    // best-effort side effects of posting a message, never a reason to
    // block the message from saving. Each still has to be a legal move per
    // supportTicketService's transition graph (SUPPORT-2): e.g. isSolution
    // on a ticket that's still "open" (never claimed via in_progress) is
    // silently skipped rather than short-circuiting the normal sequence.
    let nextStatus = null;
    if (isSolution && supportTicketService.canTransitionTo(ticket.status, "resolved")) {
      nextStatus = "resolved";
    } else if (
      !isInternalNote &&
      authorType === "agent" &&
      supportTicketService.canTransitionTo(ticket.status, "waiting_customer")
    ) {
      nextStatus = "waiting_customer";
    } else if (
      authorType === "customer" &&
      supportTicketService.canTransitionTo(ticket.status, "in_progress")
    ) {
      nextStatus = "in_progress";
    }

    if (nextStatus) {
      ticket.status = nextStatus;
      if (nextStatus === "resolved") ticket.sla.resolvedAt = new Date();
      await ticket.save();
    }

    // emitEvent() is synchronous and already swallows/logs listener errors
    // internally (see eventBus.js)  this try/catch is just an extra guard
    // so a failed notification can never fail the message itself.
    try {
      this._notifyForMessage(ticket, message);
    } catch {
      // intentionally ignored
    }

    return message;
  }

  async rateMessage(messageId, rating, storeId) {
    if (!["up", "down"].includes(rating)) {
      const error = new Error("La note doit être 'up' ou 'down'");
      error.code = "INVALID_RATING";
      throw error;
    }

    const message = await TicketMessage.findOne({ _id: messageId, storeId });
    if (!message) return null;

    if (message.authorType !== "agent") {
      const error = new Error("Seuls les messages d'un agent peuvent être notés");
      error.code = "NOT_AGENT_MESSAGE";
      throw error;
    }

    message.rating = rating;
    return await message.save();
  }

  // SFG-80 Phase 4: migrated off the old flat Notification.create() calls
  // (untargeted docs, no recipientId to query by) onto the eventBus-driven
  // system the dev merge brought in  "ticket.agent_replied" and
  // "ticket.customer_replied" are wired in NotificationEventHandler.js.
  _notifyForMessage(ticket, message) {
    if (message.isInternalNote) return; // internal notes never notify the customer

    if (message.authorType === "agent") {
      // Prefer the explicit customerId; fall back to createdBy for tickets a
      // customer opened themselves (customerId is only set when a merchant
      // opens a ticket on a customer's behalf  see SupportTicket.js).
      const customerId =
        ticket.customerId || (ticket.createdByType === "customer" ? ticket.createdBy : null);
      if (!customerId) return;

      // deduplicationKey includes message._id (not left to notify()'s default
      // 5-minute time bucket)  two genuine agent replies within 5 minutes
      // are two separate things the customer should hear about, not a
      // "duplicate" of the same notification. Same reasoning for
      // ticket.customer_replied below.
      emitEvent("ticket.agent_replied", {
        storeId: ticket.storeId,
        entityId: ticket._id,
        actorId: message.author,
        recipients: [customerId],
        metadata: { ticketNumber: ticket.ticketNumber },
        actionUrl: `/support-tickets/${ticket._id}`,
        deduplicationKey: `ticket.agent_replied:${message._id}`,
      });
      return;
    }

    if (message.authorType === "customer" && ticket.assignedTo) {
      emitEvent("ticket.customer_replied", {
        storeId: ticket.storeId,
        entityId: ticket._id,
        recipients: [ticket.assignedTo],
        metadata: { ticketNumber: ticket.ticketNumber },
        actionUrl: `/support-tickets/${ticket._id}`,
        deduplicationKey: `ticket.customer_replied:${message._id}`,
      });
    }
  }
}

module.exports = new TicketMessageService();
