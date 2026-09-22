const supportTicketService = require("../service/supportTicketService");
const ticketMessageService = require("../service/ticketMessageService");
const TicketMessage = require("../models/TicketMessage");
const { getActiveStoreId } = require("../utils/getActiveStore");
const { sendSupportTicketConfirmationEmail } = require("../utils/mailer");
const { emitEvent } = require("../lib/eventBus");

// SFG-80 Phase 4: resolves "the customer to notify" the same way
// ticketMessageService._notifyForMessage does  prefer the explicit
// customerId, fall back to createdBy for tickets a customer opened
// themselves (customerId is only set when a merchant opens on their behalf).
const ticketCustomerId = (ticket) =>
  ticket.customerId || (ticket.createdByType === "customer" ? ticket.createdBy : null);

// Support tickets can be opened by a customer (storefront) or by staff on a
// customer's behalf (back office)  see createdByType/createdBy on the
// SupportTicket model. Which principal is on the request depends on which
// auth chain the route was mounted with (see routes.js): req.customer for
// the storefront-facing mount, req.user for the staff-facing one.
const resolveCreator = async (req) => {
  if (req.customer) {
    return {
      storeId: req.customer.storeId,
      createdByType: "customer",
      createdBy: req.customer._id,
      email: req.customer.email,
    };
  }

  if (req.user) {
    const storeId = await getActiveStoreId();
    return {
      storeId,
      createdByType: "merchant",
      createdBy: req.user._id,
      email: req.user.email,
      // Staff opening a ticket on the back office defaults to "admin"
      // rather than the schema's storefront-oriented "web" default 
      // callers can still override via req.body.source (e.g. "email").
      defaultSource: "admin",
    };
  }

  return null;
};

// SUPPORT-3: same dual-principal pattern as resolveCreator above, but for
// endpoints that act on an *existing* ticket (detail view, messages,
// ratings) rather than creating one  kept separate so Phase 1/2 code paths
// stay untouched.
const resolveRequester = async (req) => {
  if (req.customer) {
    return { requesterType: "customer", requesterId: req.customer._id, storeId: req.customer.storeId };
  }

  if (req.user) {
    const storeId = await getActiveStoreId();
    return { requesterType: "agent", requesterId: req.user._id, storeId };
  }

  return null;
};

// A customer may only ever act on a ticket that's actually theirs  checked
// against customerId first, falling back to createdBy for tickets a
// customer opened themselves (customerId is only populated when a merchant
// opens a ticket on a customer's behalf, see SupportTicket.js).
const customerOwnsTicket = (ticket, customerId) => {
  if (ticket.customerId && String(ticket.customerId) === String(customerId)) return true;
  if (ticket.createdByType === "customer" && String(ticket.createdBy) === String(customerId)) return true;
  return false;
};

const createTicket = async (req, res) => {
  try {
    const creator = await resolveCreator(req);
    if (!creator) {
      return res.status(401).json({ success: false, message: "Authentification requise" });
    }

    const ticket = await supportTicketService.createTicket({
      storeId: creator.storeId,
      subject: req.body.subject,
      description: req.body.description,
      categoryId: req.body.categoryId,
      priority: req.body.priority,
      customerId: req.body.customerId,
      source: req.body.source || creator.defaultSource,
      attachments: req.body.attachments,
      tags: req.body.tags,
      createdByType: creator.createdByType,
      createdBy: creator.createdBy,
    });

    // Fire-and-forget, same convention as coupon/review notifications  a
    // failed email or notification must never fail the ticket creation.
    if (creator.email) {
      sendSupportTicketConfirmationEmail(creator.email, {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
      }).catch(() => {});
    }

    // SFG-80 Phase 4: migrated off the old flat Notification.create() 
    // that call produced an untargeted doc nobody could query by
    // recipientId. "ticket.created" is already wired in
    // NotificationEventHandler.js (notifies adminstore/Manager store staff),
    // so this now goes through the same targeted system as every other
    // event, with no risk of double-notifying the creator: the confirmation
    // email above and this "team inbox" event never share a recipient (the
    // event targets staff roles, not the ticket's own creator).
    emitEvent("ticket.created", {
      storeId: ticket.storeId,
      entityId: ticket._id,
      actorId: creator.createdByType === "merchant" ? creator.createdBy : null,
      metadata: { ticketNumber: ticket.ticketNumber },
      actionUrl: `/support-tickets/${ticket._id}`,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket créé avec succès",
      data: ticket,
    });
  } catch (error) {
    if (
      ["SUBJECT_TOO_SHORT", "DESCRIPTION_TOO_SHORT", "CREATOR_REQUIRED", "STORE_ID_REQUIRED"].includes(
        error.code
      )
    ) {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getTickets = async (req, res) => {
  try {
    const storeId = await getActiveStoreId();
    const {
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
    } = req.query;

    const { tickets, totalDoc, limits, pages } = await supportTicketService.getAllTickets({
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
    });

    return res.status(200).json({ success: true, data: tickets, totalDoc, limits, pages });
  } catch (error) {
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "CastError" || error.name === "BSONError") {
      return res.status(400).json({ success: false, message: "Paramètre de filtre invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// SUPPORT-3: now returns { ticket, messages } instead of just the ticket 
// mounted on both the staff and customer routers (resolveRequester picks
// the right principal), with internal notes stripped for customers at the
// service layer (ticketMessageService.getTicketDetail).
const getTicket = async (req, res) => {
  try {
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(401).json({ success: false, message: "Authentification requise" });
    }

    const detail = await ticketMessageService.getTicketDetail(
      req.params.id,
      requester.storeId,
      requester.requesterType
    );
    if (!detail) {
      return res.status(404).json({ success: false, message: "Ticket introuvable" });
    }

    if (requester.requesterType === "customer" && !customerOwnsTicket(detail.ticket, requester.requesterId)) {
      return res.status(403).json({ success: false, message: "Accès refusé  ce ticket" });
    }

    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const assignTicket = async (req, res) => {
  try {
    const storeId = await getActiveStoreId();
    // No agentId in the body means self-assign: the requesting agent picks
    // the ticket up.
    const agentId = req.body.agentId || req.user._id;

    const ticket = await supportTicketService.assignTicket(req.params.id, agentId, storeId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket introuvable" });
    }

    // Explicit deduplicationKey, same reasoning as ticket.status_changed
    // below  reassigning a ticket more than once within 5 minutes (handed
    // back and forth, corrected mis-assignment) should still notify each time.
    emitEvent("ticket.assigned", {
      storeId: ticket.storeId,
      entityId: ticket._id,
      actorId: req.user._id,
      recipients: [agentId],
      metadata: { ticketNumber: ticket.ticketNumber },
      actionUrl: `/support-tickets/${ticket._id}`,
      deduplicationKey: `ticket.assigned:${ticket._id}:${agentId}:${Date.now()}`,
    });

    return res.status(200).json({ success: true, message: "Ticket assigné avec succès", data: ticket });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const changeTicketStatus = async (req, res) => {
  try {
    const storeId = await getActiveStoreId();
    const ticket = await supportTicketService.changeTicketStatus(
      req.params.id,
      req.body.status,
      storeId
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket introuvable" });
    }

    // Only the customer is notified here  the agent who triggered this
    // explicit status change already knows about it. (Message-driven status
    // changes are a separate path with their own notifications  see
    // ticketMessageService._notifyForMessage.)
    const customerId = ticketCustomerId(ticket);
    if (customerId) {
      // Explicit deduplicationKey (not left to notify()'s default 5-minute
      // time bucket): a ticket can legitimately change status more than
      // once within 5 minutes (e.g. in_progress -> resolved right after an
      // earlier open -> in_progress), and the default bucket would silently
      // swallow the second notification as a "duplicate" of the first even
      // though the customer needs to hear about both.
      emitEvent("ticket.status_changed", {
        storeId: ticket.storeId,
        entityId: ticket._id,
        actorId: req.user._id,
        recipients: [customerId],
        metadata: { ticketNumber: ticket.ticketNumber, status: ticket.status },
        actionUrl: `/support-tickets/${ticket._id}`,
        deduplicationKey: `ticket.status_changed:${ticket._id}:${ticket.status}:${Date.now()}`,
      });
    }

    return res.status(200).json({ success: true, message: "Statut du ticket mis à jour", data: ticket });
  } catch (error) {
    if (["INVALID_STATUS", "INVALID_STATUS_TRANSITION"].includes(error.code)) {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const bulkActions = async (req, res) => {
  try {
    const storeId = await getActiveStoreId();
    const { ticketIds, action, value } = req.body;

    const result = await supportTicketService.bulkAction({ ticketIds, action, value, storeId });
    return res.status(200).json({
      success: true,
      message: "Action groupé appliqué avec succès",
      ...result,
    });
  } catch (error) {
    if (["TICKET_IDS_REQUIRED", "INVALID_BULK_ACTION", "INVALID_PRIORITY_VALUE"].includes(error.code)) {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// SUPPORT-3: shared by both routers  isInternalNote is passed through as
// sent; a customer sending isInternalNote=true is rejected outright by
// ticketMessageService (INTERNAL_NOTE_FORBIDDEN, 422) rather than silently
// coerced to false, per the ticket's explicit "rejette avec une erreur
// claire" requirement. An agent can set both isInternalNote and isSolution
// freely.
const addTicketMessage = async (req, res) => {
  try {
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(401).json({ success: false, message: "Authentification requise" });
    }

    const ticket = await supportTicketService.getTicketById(req.params.id, requester.storeId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket introuvable" });
    }
    if (requester.requesterType === "customer" && !customerOwnsTicket(ticket, requester.requesterId)) {
      return res.status(403).json({ success: false, message: "Accès refusé  ce ticket" });
    }

    const message = await ticketMessageService.addMessage(
      req.params.id,
      {
        content: req.body.content,
        isInternalNote: !!req.body.isInternalNote,
        isSolution: !!req.body.isSolution,
      },
      requester.requesterId,
      requester.requesterType,
      requester.storeId
    );
    if (!message) {
      return res.status(404).json({ success: false, message: "Ticket introuvable" });
    }

    return res.status(201).json({ success: true, message: "Message ajouté", data: message });
  } catch (error) {
    if (["CONTENT_REQUIRED", "INTERNAL_NOTE_FORBIDDEN"].includes(error.code)) {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === "NO_ACTIVE_STORE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

// SUPPORT-3: customer-only in practice (rating an agent's reply), but
// ownership is still enforced here rather than assumed from the mount 
// same defense-in-depth as the other customer-facing actions above.
const rateTicketMessage = async (req, res) => {
  try {
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(401).json({ success: false, message: "Authentification requise" });
    }

    const message = await TicketMessage.findOne({ _id: req.params.messageId, storeId: requester.storeId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }

    if (requester.requesterType === "customer") {
      const ticket = await supportTicketService.getTicketById(message.ticket, requester.storeId);
      if (!ticket || !customerOwnsTicket(ticket, requester.requesterId)) {
        return res.status(403).json({ success: false, message: "Accès refusé  ce ticket" });
      }
    }

    const rated = await ticketMessageService.rateMessage(req.params.messageId, req.body.rating, requester.storeId);
    if (!rated) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }

    return res.status(200).json({ success: true, message: "Note enregistrée", data: rated });
  } catch (error) {
    if (error.code === "INVALID_RATING") {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.code === "NOT_AGENT_MESSAGE") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  assignTicket,
  changeTicketStatus,
  bulkActions,
  addTicketMessage,
  rateTicketMessage,
};
