const mongoose = require("mongoose");

/**
 * Note  Internal annotation attached to ANY resource in the SaaS.
 *
 * Used as a transversal comments / memos layer for the back-office (never
 * visible to the end customer). Generic enough to be attached to orders,
 * customers, products, support tickets, shipments, invoices, stores, ...
 *
 * Multi-tenant:
 *   Every note MUST belong to a store. storeId is the *first* level of the
 *   query plan for every read. Any controller that reads a note must also
 *   scope its lookup by the current store (see controllers/noteController.js).
 *
 * Immutability of audit-relevant fields:
 *   `authorId` and `storeId` are intentionally NOT exposed to PATCH. The only
 *   way to attribute a note to a different author is to delete + recreate it
 *   (which itself is audited).
 */
const noteSchema = new mongoose.Schema(
  {
    // --- tenant -----------------------------------------------------------
    // Required for store notes (the vast majority of notes). Made optional
    // for "platform notes"  internal memos written by a super-admin and
    // attached to NO store (audit reminders, platform-wide to-dos, etc.).
    // The `scope` field below is the source of truth for which kind of
    // note this is; the (scope, storeId) combination is validated by the
    // service layer (see NoteService.create).
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },

    // --- scope ------------------------------------------------------------
    // `internal` (default): attached to a tenant resource (order, product,
    //                      customer, ...). storeId MUST be set.
    // `platform`:          super-admin-only memo. storeId MUST be null.
    scope: {
      type: String,
      enum: ["internal", "platform"],
      default: "internal",
      required: true,
      index: true,
    },

    // --- author -----------------------------------------------------------
    // The staff member who wrote the note. Always set from the auth context;
    // the API MUST reject any client-supplied authorId.
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // --- polymorphic target ----------------------------------------------
    // Discriminator of the resource the note is attached to.
    entityType: {
      type: String,
      required: true,
      enum: [
        "order",
        "customer",
        "product",
        "ticket",
        "shipment",
        "invoice",
        "store",
        // Super-admin-only memos not tied to a specific resource.
        // The entityId is null for those (validated at the service layer).
        "platform",
      ],
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      default: null,
      index: true,
    },

    // --- content ----------------------------------------------------------
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },

    // --- meta -------------------------------------------------------------
    // V1 only ever sets "internal"; kept as an enum so V2 (e.g. system /
    // private) doesn't require a schema migration.
    visibility: {
      type: String,
      enum: ["internal"],
      default: "internal",
      required: true,
    },

    // Pinned notes appear first in lists. Toggled via the dedicated
    // /api/notes/:id/pin endpoint (or PATCH if the user only has update).
    pinned: {
      type: Boolean,
      default: false,
    },

    // Soft-delete. Notes are never hard-deleted by the user: the row is
    // kept around so the AuditLog entry remains useful.
    archived: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "notes",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- indexes -----------------------------------------------------------------

// Primary access path: list all (non-archived) notes for one resource,
// newest first, with pinned on top. Used by NotesPanel and the
// "list notes attached to this order" routes.
noteSchema.index(
  { storeId: 1, entityType: 1, entityId: 1, pinned: -1, createdAt: -1 },
  { name: "store_entity_pinned_created" }
);

// Filter by author (e.g. "all notes written by Yassine" view, audit trail).
noteSchema.index(
  { storeId: 1, authorId: 1, createdAt: -1 },
  { name: "store_author_created" }
);

// Generic store scope for dashboard counters / global lists.
noteSchema.index(
  { storeId: 1, createdAt: -1 },
  { name: "store_created" }
);

// Speeds up soft-delete queries (excludes archived by default).
noteSchema.index(
  { storeId: 1, archived: 1, deletedAt: 1 },
  { name: "store_archived_deleted" }
);

// --- query helpers ----------------------------------------------------------

// Default: ignore soft-deleted. Controllers can opt out by passing
// { includeArchived: true }.
// Internal: scope is implicitly "internal"; a missing scope on a legacy
// document does not block reads.
noteSchema.query.active = function activeQuery() {
  return this.where({ deletedAt: null });
};

const Note = mongoose.model("Note", noteSchema);

module.exports = Note;
