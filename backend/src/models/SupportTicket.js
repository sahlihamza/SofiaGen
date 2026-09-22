const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: false,
    },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    // Auto-generated, format SUP-XXXXXX, unique per store (see index below).
    ticketNumber: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Le sujet est obligatoire"],
      minlength: [10, "Le sujet doit contenir au moins 10 caractères"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "La description est obligatoire"],
      minlength: [50, "La description doit contenir au moins 50 caractères"],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TicketCategory",
      required: false,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
      default: "open",
    },
    // Two distinct user collections in this project (User = admin/staff,
    // Customer = boutique clients) so a single fixed `ref` can't cover both
    // authors. createdByType tells which collection createdBy points to.
    createdByType: {
      type: String,
      enum: ["customer", "merchant"],
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    // Distinct from createdBy: createdBy is "who opened the ticket" (could be
    // a merchant on the customer's behalf), customerId is "which customer
    // this ticket is about"  always a Customer, nullable when a ticket has
    // no associated customer (e.g. an internal/admin-only ticket).
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
      default: null,
    },
    source: {
      type: String,
      enum: ["web", "order", "email", "admin", "api"],
      default: "web",
    },
    // Plain string for now; SUPPORT-5 will turn this into a real team
    // reference once team management exists.
    assignedTeam: {
      type: String,
      required: false,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    sla: {
      firstResponseDeadline: {
        type: Date,
        required: false,
        default: null,
      },
      resolutionDeadline: {
        type: Date,
        required: false,
        default: null,
      },
      firstResponseAt: {
        type: Date,
        required: false,
        default: null,
      },
      resolvedAt: {
        type: Date,
        required: false,
        default: null,
      },
      // Not authoritative  supportTicketService recomputes this from
      // resolutionDeadline on every read rather than trusting this stored
      // value, since nothing currently keeps it in sync between reads (a
      // ticket left untouched would otherwise go stale as "ok" forever).
      // Kept as a schema field for SUPPORT-5+ (e.g. a cron job or webhook
      // that needs to persist/alert on it).
      status: {
        type: String,
        enum: ["ok", "warning", "overdue"],
        default: "ok",
      },
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ storeId: 1, ticketNumber: 1 }, { unique: true });
supportTicketSchema.index({ storeId: 1, status: 1, priority: 1 });

const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

module.exports = SupportTicket;
