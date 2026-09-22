const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");

const SupportTicket = require("../models/SupportTicket");
const TicketMessage = require("../models/TicketMessage");
const TicketCategory = require("../models/TicketCategory");
const Store = require("../models/Store");
const Customer = require("../models/Customer");
const User = require("../models/User");
const supportTicketService = require("../service/supportTicketService");
const ticketMessageService = require("../service/ticketMessageService");

// ---------------------------------------------------------------------------
// Pure-logic tests (no database): state machine + SLA computation
// ---------------------------------------------------------------------------

test("canTransitionTo: allows the documented forward path open -> in_progress -> waiting_customer -> resolved -> closed", () => {
  assert.equal(supportTicketService.canTransitionTo("open", "in_progress"), true);
  assert.equal(supportTicketService.canTransitionTo("in_progress", "waiting_customer"), true);
  assert.equal(supportTicketService.canTransitionTo("waiting_customer", "resolved"), true);
  assert.equal(supportTicketService.canTransitionTo("resolved", "closed"), true);
});

test("canTransitionTo: allows the two deliberate backward edges (waiting_customer -> in_progress, resolved -> in_progress)", () => {
  assert.equal(supportTicketService.canTransitionTo("waiting_customer", "in_progress"), true);
  assert.equal(supportTicketService.canTransitionTo("resolved", "in_progress"), true);
});

test("canTransitionTo: allows in_progress -> resolved directly (skipping waiting_customer)", () => {
  assert.equal(supportTicketService.canTransitionTo("in_progress", "resolved"), true);
});

test("canTransitionTo: rejects open -> resolved (must go through in_progress first)", () => {
  assert.equal(supportTicketService.canTransitionTo("open", "resolved"), false);
});

test("canTransitionTo: rejects any transition out of closed (terminal state)", () => {
  assert.equal(supportTicketService.canTransitionTo("closed", "open"), false);
  assert.equal(supportTicketService.canTransitionTo("closed", "in_progress"), false);
  assert.equal(supportTicketService.canTransitionTo("closed", "resolved"), false);
});

test("canTransitionTo: rejects jumping back to open from any non-open state", () => {
  assert.equal(supportTicketService.canTransitionTo("in_progress", "open"), false);
  assert.equal(supportTicketService.canTransitionTo("waiting_customer", "open"), false);
  assert.equal(supportTicketService.canTransitionTo("resolved", "open"), false);
});

test("canTransitionTo: rejects unknown statuses", () => {
  assert.equal(supportTicketService.canTransitionTo("open", "nonexistent"), false);
  assert.equal(supportTicketService.canTransitionTo("nonexistent", "open"), false);
});

test("computeSlaStatus: returns 'ok' for resolved tickets regardless of deadline", () => {
  const ticket = {
    status: "resolved",
    sla: { resolutionDeadline: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "ok");
});

test("computeSlaStatus: returns 'ok' for closed tickets regardless of deadline", () => {
  const ticket = {
    status: "closed",
    sla: { resolutionDeadline: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "ok");
});

test("computeSlaStatus: returns 'overdue' when resolutionDeadline is in the past for an open ticket", () => {
  const ticket = {
    status: "open",
    sla: { resolutionDeadline: new Date(Date.now() - 1000 * 60 * 60) },
  };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "overdue");
});

test("computeSlaStatus: returns 'warning' when resolutionDeadline is within 2 hours", () => {
  const ticket = {
    status: "in_progress",
    sla: { resolutionDeadline: new Date(Date.now() + 60 * 60 * 1000) },
  };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "warning");
});

test("computeSlaStatus: returns 'ok' when resolutionDeadline is more than 2 hours away", () => {
  const ticket = {
    status: "open",
    sla: { resolutionDeadline: new Date(Date.now() + 10 * 60 * 60 * 1000) },
  };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "ok");
});

test("computeSlaStatus: returns 'ok' when resolutionDeadline is missing", () => {
  const ticket = { status: "open", sla: {} };
  assert.equal(supportTicketService.computeSlaStatus(ticket), "ok");
});

test("computeSla: produces correct deadlines per priority", () => {
  const critical = supportTicketService.computeSla("critical");
  const high = supportTicketService.computeSla("high");
  const normal = supportTicketService.computeSla("normal");
  const low = supportTicketService.computeSla("low");

  const approx = (deadline, hours) =>
    Math.abs(deadline.getTime() - (Date.now() + hours * 60 * 60 * 1000)) < 5000;

  assert.ok(approx(critical.firstResponseDeadline, 1), "critical first response = 1h");
  assert.ok(approx(critical.resolutionDeadline, 4), "critical resolution = 4h");
  assert.ok(approx(high.firstResponseDeadline, 4), "high first response = 4h");
  assert.ok(approx(high.resolutionDeadline, 12), "high resolution = 12h");
  assert.ok(approx(normal.firstResponseDeadline, 24), "normal first response = 24h");
  assert.ok(approx(normal.resolutionDeadline, 48), "normal resolution = 48h");
  assert.ok(approx(low.firstResponseDeadline, 48), "low first response = 48h");
  assert.ok(approx(low.resolutionDeadline, 120), "low resolution = 120h");
});

test("computeSla: falls back to normal priority for unknown values", () => {
  const fallback = supportTicketService.computeSla("unknown");
  const normal = supportTicketService.computeSla("normal");
  assert.equal(fallback.firstResponseDeadline.getTime(), normal.firstResponseDeadline.getTime());
  assert.equal(fallback.resolutionDeadline.getTime(), normal.resolutionDeadline.getTime());
});

// ---------------------------------------------------------------------------
// Integration tests (require database)
// ---------------------------------------------------------------------------

let storeA;
let storeB;
let customerA;
let customerB;
let agentA;
let agentB;
let categoryA;
let ticketA1;
let ticketA2;
let ticketB1;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  storeA = await Store.create({ name: "__support_test__ Store A" });
  storeB = await Store.create({ name: "__support_test__ Store B" });

  customerA = await Customer.create({
    firstName: "SupportA",
    lastName: "Test",
    email: `support-a-${Date.now()}@example.com`,
    storeId: storeA._id,
  });
  customerB = await Customer.create({
    firstName: "SupportB",
    lastName: "Test",
    email: `support-b-${Date.now()}@example.com`,
    storeId: storeB._id,
  });

  agentA = await User.create({
    name: "Agent A",
    email: `agent-a-${Date.now()}@example.com`,
    password: "password123",
    type: "admin-store",
  });
  agentB = await User.create({
    name: "Agent B",
    email: `agent-b-${Date.now()}@example.com`,
    password: "password123",
    type: "admin-store",
  });

  categoryA = await TicketCategory.create({
    storeId: storeA._id,
    name: "Billing",
    description: "Billing issues",
  });

  ticketA1 = await supportTicketService.createTicket({
    storeId: storeA._id,
    subject: "Cannot access my invoice",
    description: "I have been trying to access my invoice for the past 3 days but the system keeps returning an error message when I click on the download button.",
    categoryId: categoryA._id,
    priority: "high",
    createdByType: "customer",
    createdBy: customerA._id,
    customerId: customerA._id,
    source: "web",
  });

  ticketA2 = await supportTicketService.createTicket({
    storeId: storeA._id,
    subject: "Refund request for order",
    description: "I would like to request a refund for my recent order. The product arrived damaged and I need to return it as soon as possible.",
    priority: "normal",
    createdByType: "merchant",
    createdBy: agentA._id,
    source: "admin",
  });

  ticketB1 = await supportTicketService.createTicket({
    storeId: storeB._id,
    subject: "Store B issue",
    description: "This is a completely different store's ticket that should never appear in store A's results under any circumstances.",
    priority: "low",
    createdByType: "customer",
    createdBy: customerB._id,
    customerId: customerB._id,
  });
});

test.after(async () => {
  await Promise.all([
    SupportTicket.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    TicketMessage.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    TicketCategory.deleteMany({ storeId: { $in: [storeA?._id, storeB?._id] } }),
    Customer.deleteMany({ _id: { $in: [customerA?._id, customerB?._id] } }),
    User.deleteMany({ _id: { $in: [agentA?._id, agentB?._id] } }),
    Store.deleteMany({ _id: { $in: [storeA?._id, storeB?._id] } }),
  ]);
  await mongoose.disconnect();
});

test("createTicket: generates unique ticket numbers per store", async () => {
  assert.ok(ticketA1.ticketNumber.startsWith("SUP-"));
  assert.ok(ticketA2.ticketNumber.startsWith("SUP-"));
  assert.ok(ticketB1.ticketNumber.startsWith("SUP-"));
  assert.notEqual(ticketA1.ticketNumber, ticketA2.ticketNumber);
});

test("createTicket: rejects subject shorter than 10 characters", async () => {
  await assert.rejects(
    () =>
      supportTicketService.createTicket({
        storeId: storeA._id,
        subject: "Short",
        description: "This is a valid description that is definitely longer than fifty characters for sure.",
        createdByType: "customer",
        createdBy: customerA._id,
      }),
    (err) => err.code === "SUBJECT_TOO_SHORT"
  );
});

test("createTicket: rejects description shorter than 50 characters", async () => {
  await assert.rejects(
    () =>
      supportTicketService.createTicket({
        storeId: storeA._id,
        subject: "Valid subject line",
        description: "Too short",
        createdByType: "customer",
        createdBy: customerA._id,
      }),
    (err) => err.code === "DESCRIPTION_TOO_SHORT"
  );
});

test("getAllTickets: store A never sees store B's tickets", async () => {
  const { tickets } = await supportTicketService.getAllTickets({ storeId: storeA._id });
  const ids = tickets.map((t) => String(t._id));
  assert.ok(ids.includes(String(ticketA1._id)));
  assert.ok(ids.includes(String(ticketA2._id)));
  assert.ok(!ids.includes(String(ticketB1._id)), "store B's ticket leaked into store A's results");
});

test("getAllTickets: store B only sees its own ticket", async () => {
  const { tickets } = await supportTicketService.getAllTickets({ storeId: storeB._id });
  const ids = tickets.map((t) => String(t._id));
  assert.ok(ids.includes(String(ticketB1._id)));
  assert.ok(!ids.includes(String(ticketA1._id)), "store A's ticket leaked into store B's results");
  assert.ok(!ids.includes(String(ticketA2._id)), "store A's ticket leaked into store B's results");
});

test("getAllTickets: filtering by status works correctly", async () => {
  await supportTicketService.changeTicketStatus(ticketA1._id, "in_progress", storeA._id);
  const { tickets } = await supportTicketService.getAllTickets({
    storeId: storeA._id,
    status: "in_progress",
  });
  assert.ok(tickets.length >= 1);
  assert.ok(tickets.every((t) => t.status === "in_progress"));
});

test("getTicketById: returns null for a ticket belonging to another store", async () => {
  const result = await supportTicketService.getTicketById(ticketB1._id, storeA._id);
  assert.equal(result, null);
});

test("changeTicketStatus: rejects invalid transition with proper error code", async () => {
  await assert.rejects(
    () => supportTicketService.changeTicketStatus(ticketA2._id, "resolved", storeA._id),
    (err) => err.code === "INVALID_STATUS_TRANSITION"
  );
});

test("changeTicketStatus: rejects transitioning to the same status", async () => {
  await assert.rejects(
    () => supportTicketService.changeTicketStatus(ticketA2._id, "open", storeA._id),
    (err) => err.code === "INVALID_STATUS_TRANSITION"
  );
});

test("changeTicketStatus: sets resolvedAt when transitioning to resolved", async () => {
  const updated = await supportTicketService.changeTicketStatus(ticketA2._id, "in_progress", storeA._id);
  const resolved = await supportTicketService.changeTicketStatus(ticketA2._id, "resolved", storeA._id);
  assert.ok(resolved.sla.resolvedAt instanceof Date);
});

test("bulkAction: assigns multiple tickets at once", async () => {
  const result = await supportTicketService.bulkAction({
    ticketIds: [ticketA1._id, ticketA2._id],
    action: "assign",
    value: agentA._id,
    storeId: storeA._id,
  });
  assert.equal(result.matchedCount, 2);
  assert.equal(result.modifiedCount, 2);
});

test("bulkAction: updates priority on multiple tickets", async () => {
  const result = await supportTicketService.bulkAction({
    ticketIds: [ticketA1._id],
    action: "priority",
    value: "critical",
    storeId: storeA._id,
  });
  assert.equal(result.matchedCount, 1);
  const updated = await supportTicketService.getTicketById(ticketA1._id, storeA._id);
  assert.equal(updated.priority, "critical");
});

test("bulkAction: adds tag to multiple tickets", async () => {
  const result = await supportTicketService.bulkAction({
    ticketIds: [ticketA1._id, ticketA2._id],
    action: "tag",
    value: "escalated",
    storeId: storeA._id,
  });
  assert.equal(result.matchedCount, 2);
  const updated = await supportTicketService.getTicketById(ticketA1._id, storeA._id);
  assert.ok(updated.tags.includes("escalated"));
});

test("bulkAction: rejects empty ticketIds", async () => {
  await assert.rejects(
    () =>
      supportTicketService.bulkAction({
        ticketIds: [],
        action: "assign",
        value: agentA._id,
        storeId: storeA._id,
      }),
    (err) => err.code === "TICKET_IDS_REQUIRED"
  );
});

test("bulkAction: rejects invalid action", async () => {
  await assert.rejects(
    () =>
      supportTicketService.bulkAction({
        ticketIds: [ticketA1._id],
        action: "invalid_action",
        value: "test",
        storeId: storeA._id,
      }),
    (err) => err.code === "INVALID_BULK_ACTION"
  );
});

test("bulkAction: rejects invalid priority value", async () => {
  await assert.rejects(
    () =>
      supportTicketService.bulkAction({
        ticketIds: [ticketA1._id],
        action: "priority",
        value: "invalid",
        storeId: storeA._id,
      }),
    (err) => err.code === "INVALID_PRIORITY_VALUE"
  );
});

test("bulkAction: does not affect tickets from other stores", async () => {
  await supportTicketService.bulkAction({
    ticketIds: [ticketA1._id, ticketB1._id],
    action: "tag",
    value: "bulk-tag",
    storeId: storeA._id,
  });
  const ticketB = await supportTicketService.getTicketById(ticketB1._id, storeB._id);
  assert.ok(!ticketB.tags.includes("bulk-tag"), "bulk action leaked to another store's ticket");
});

test("ticketMessageService.getTicketDetail: customer never receives internal notes", async () => {
  await ticketMessageService.addMessage(
    ticketA1._id,
    { content: "Public reply from agent", isInternalNote: false },
    agentA._id,
    "agent",
    storeA._id
  );
  await ticketMessageService.addMessage(
    ticketA1._id,
    { content: "Internal note  do not show to customer", isInternalNote: true },
    agentA._id,
    "agent",
    storeA._id
  );

  const agentView = await ticketMessageService.getTicketDetail(ticketA1._id, storeA._id, "agent");
  assert.equal(agentView.messages.length, 2, "agent sees both messages");

  const customerView = await ticketMessageService.getTicketDetail(ticketA1._id, storeA._id, "customer");
  assert.equal(customerView.messages.length, 1, "customer sees only the public message");
  assert.ok(
    customerView.messages.every((m) => m.isInternalNote === false),
    "customer view contains an internal note"
  );
});

test("ticketMessageService.addMessage: rejects isInternalNote from non-agent", async () => {
  await assert.rejects(
    () =>
      ticketMessageService.addMessage(
        ticketA1._id,
        { content: "Trying to post internal note as customer", isInternalNote: true },
        customerA._id,
        "customer",
        storeA._id
      ),
    (err) => err.code === "INTERNAL_NOTE_FORBIDDEN"
  );
});

test("ticketMessageService.addMessage: rejects empty content", async () => {
  await assert.rejects(
    () =>
      ticketMessageService.addMessage(
        ticketA1._id,
        { content: "   ", isInternalNote: false },
        agentA._id,
        "agent",
        storeA._id
      ),
    (err) => err.code === "CONTENT_REQUIRED"
  );
});

test("ticketMessageService.getTicketDetail: returns null for non-existent ticket", async () => {
  const fakeId = new mongoose.Types.ObjectId();
  const result = await ticketMessageService.getTicketDetail(fakeId, storeA._id, "agent");
  assert.equal(result, null);
});

test("ticketMessageService.getTicketDetail: returns null for ticket in different store", async () => {
  const result = await ticketMessageService.getTicketDetail(ticketB1._id, storeA._id, "agent");
  assert.equal(result, null);
});
