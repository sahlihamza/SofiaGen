const Note = require("../models/Note");
const AuditService = require("./AuditService");
const mongoose = require("mongoose");

const VALID_ENTITY_TYPES = Note.schema.path("entityType").enumValues;
const ALLOWED_FILTER_ENTITY_TYPES = new Set(VALID_ENTITY_TYPES);

const MAX_CONTENT_LENGTH = 5000;
const MAX_BATCH_OPS = 100;

const ERR = {
  validation: (msg) => ({ status: 422, code: "NOTE_VALIDATION", message: msg }),
  notFound: () => ({ status: 404, code: "NOTE_NOT_FOUND", message: "Note not found" }),
  forbidden: () => ({ status: 403, code: "NOTE_FORBIDDEN", message: "Forbidden" }),
  crossStore: () => ({
    status: 403,
    code: "NOTE_CROSS_STORE",
    message: "Note does not belong to the active store",
  }),
  conflict: (msg) => ({ status: 409, code: "NOTE_CONFLICT", message: msg }),
};

/**
 * Resolve the working storeId + scope.
 * - For internal (store) notes, storeId MUST be set.
 * - For platform notes (super-admin memos), storeId is null and scope is
 *   "platform". Only the platform permission set can write here.
 *
 * Returns { storeId, scope } or throws NOTE_NO_ACTIVE_STORE.
 */
function resolveScope(authContext) {
  if (!authContext) {
    throw formatError({
      status: 401,
      code: "NOTE_NO_ACTIVE_STORE",
      message: "No auth context",
    });
  }
  // Platform context: super-admin, no store. The NoteService.list/create
  // helpers below switch behaviour when the caller passes `scope: "platform"`.
  const scope = authContext.scope === "platform" ? "platform" : "internal";
  const storeId = scope === "platform" ? null : authContext.storeId;
  if (scope === "internal" && !storeId) {
    throw formatError({
      status: 400,
      code: "NOTE_NO_ACTIVE_STORE",
      message: "No active store in auth context",
    });
  }
  return { storeId, scope };
}

function ensurePermission(authContext, code) {
  if (!authContext || !authContext.permissions || !authContext.permissions.has(code)) {
    throw formatError({
      status: 403,
      code: "NOTE_PERMISSION_DENIED",
      message: `Missing permission: ${code}`,
    });
  }
}

function formatError(err) {
  const e = new Error(err.message);
  e.status = err.status;
  e.code = err.code;
  return e;
}

/**
 * Sanitise a payload. Strips any client-supplied authorId / storeId so they
 * cannot be forged.
 */
function sanitizeInput(payload) {
  const out = {};
  if (typeof payload.content === "string") out.content = payload.content.trim();
  if (payload.entityType) out.entityType = String(payload.entityType).toLowerCase();
  if (payload.entityId) out.entityId = payload.entityId;
  if (typeof payload.pinned === "boolean") out.pinned = payload.pinned;
  // Strip forged fields. Backend always sets them.
  delete out.storeId;
  delete out.authorId;
  delete out.archived;
  delete out.deletedAt;
  delete out.visibility;
  return out;
}

function validateContent(content) {
  if (typeof content !== "string" || content.length < 1) {
    throw formatError(ERR.validation("content is required"));
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw formatError(
      ERR.validation(`content exceeds ${MAX_CONTENT_LENGTH} characters`)
    );
  }
  return content;
}

function validateEntityType(entityType) {
  if (!ALLOWED_FILTER_ENTITY_TYPES.has(entityType)) {
    throw formatError(
      ERR.validation(
        `entityType must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
      )
    );
  }
  return entityType;
}

function validateObjectId(value, label) {
  // mongoose.Types.ObjectId.isObjectIdLike is permissive (accepts hex strings);
  // we want strict: must already be an ObjectId or a 24-char hex string.
  const isValid =
    value && (value instanceof mongoose.Types.ObjectId || /^[a-f0-9]{24}$/i.test(String(value)));
  if (!isValid) {
    throw formatError(ERR.validation(`${label} must be a valid ObjectId`));
  }
  return value;
}

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}

function buildActor(authContext) {
  return {
    id: authContext.userId,
    name: authContext.user ? authContext.user.name : null,
    role: authContext.role ? authContext.role.name : null,
    storeId: authContext.storeId,
  };
}

async function audit(authContext, action, note, before) {
  // AuditService.logAction signature is flexible; we pass a normalised payload.
  const actor = buildActor(authContext);
  await AuditService.logAction({
    actorType: actor.role ? "store_owner" : "system",
    actorId: actor.id,
    actorNameSnapshot: actor.name,
    storeId: actor.storeId,
    action,
    module: "Notes",
    entityType: "note",
    entityId: note._id,
    resource: { type: "note", id: note._id, name: (note.content || "").slice(0, 60) },
    status: "success",
    severity: action === "note.deleted" ? "medium" : "low",
    metadata: {
      noteEntityType: note.entityType,
      noteEntityId: note.entityId,
      pinned: !!note.pinned,
      ...(before ? { before } : {}),
    },
    ip: authContext.ip,
    userAgent: authContext.userAgent,
  });
}

/* -------------------------------------------------------------------------- */
/*                              CRUD operations                              */
/* -------------------------------------------------------------------------- */

async function list(authContext, query = {}) {
  const { storeId, scope } = resolveScope(authContext);
  // Internal (store) and platform notes require different permissions.
  ensurePermission(
    authContext,
    scope === "platform" ? "platform.notes.view" : "notes.view"
  );

  const filter = { deletedAt: null, scope };

  if (scope === "internal") {
    filter.storeId = storeId;
  }

  if (query.entityType) filter.entityType = validateEntityType(query.entityType);
  if (query.entityId) filter.entityId = validateObjectId(query.entityId, "entityId");
  if (query.authorId) filter.authorId = validateObjectId(query.authorId, "authorId");
  if (typeof query.pinned === "boolean") filter.pinned = query.pinned;
  if (typeof query.pinned === "string") {
    filter.pinned = query.pinned === "true";
  }
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) {
      const d = new Date(query.createdFrom);
      if (Number.isNaN(d.getTime())) {
        throw formatError(ERR.validation("createdFrom is not a valid date"));
      }
      filter.createdAt.$gte = d;
    }
    if (query.createdTo) {
      const d = new Date(query.createdTo);
      if (Number.isNaN(d.getTime())) {
        throw formatError(ERR.validation("createdTo is not a valid date"));
      }
      filter.createdAt.$lte = d;
    }
  }
  if (query.search && typeof query.search === "string" && query.search.trim().length >= 2) {
    const safe = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.content = { $regex: safe, $options: "i" };
  }

  const { page, limit, skip } = parsePagination(query);

  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ pinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "name email")
      .lean({ virtuals: true }),
    Note.countDocuments(filter),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getById(authContext, noteId) {
  validateObjectId(noteId, "noteId");
  const note = await Note.findOne({ _id: noteId, deletedAt: null })
    .populate("authorId", "name email")
    .lean({ virtuals: true });
  if (!note) {
    // Don't distinguish 404 vs 403 to avoid leaking existence across stores.
    throw formatError(ERR.notFound());
  }
  // Tenant check: internal notes require the same storeId; platform notes
  // require platform scope. A store user must never see a platform note
  // and vice-versa.
  const { scope } = resolveScope(authContext);
  if (note.scope !== scope) {
    throw formatError(ERR.notFound());
  }
  if (scope === "internal") {
    ensurePermission(authContext, "notes.view");
    if (String(note.storeId) !== String(authContext.storeId)) {
      throw formatError(ERR.notFound());
    }
  } else {
    ensurePermission(authContext, "platform.notes.view");
  }
  return note;
}

async function create(authContext, rawPayload) {
  const { scope } = resolveScope(authContext);
  if (scope === "platform") {
    ensurePermission(authContext, "platform.notes.create");
  } else {
    ensurePermission(authContext, "notes.create");
  }
  const authorId = authContext.userId;
  if (!authorId) {
    throw formatError(ERR.forbidden());
  }

  const payload = sanitizeInput(rawPayload || {});

  // The client cannot pick scope/storeId/entityType/entityId freely:
  // we derive them from the auth context.
  let storeId = null;
  let entityType;
  let entityId = null;

  if (scope === "platform") {
    entityType = "platform";
    // Platform notes do not target a specific resource. entityId stays null.
    storeId = null;
  } else {
    storeId = authContext.storeId;
    entityType = validateEntityType(payload.entityType);
    entityId = validateObjectId(payload.entityId, "entityId");
  }

  const content = validateContent(payload.content);
  const pinned = !!payload.pinned;

  // Cap a single client burst: PATCH endpoints can batch up to MAX_BATCH_OPS.
  if (Array.isArray(rawPayload)) {
    throw formatError(ERR.validation("Use POST /api/notes (single) for creates"));
  }

  const doc = await Note.create({
    storeId,
    authorId,
    entityType,
    entityId,
    content,
    pinned,
    visibility: "internal",
    scope,
  });

  const populated = await Note.findById(doc._id)
    .populate("authorId", "name email")
    .lean({ virtuals: true });

  await audit(authContext, "note.created", populated);
  return populated;
}

async function update(authContext, noteId, rawPayload) {
  validateObjectId(noteId, "noteId");
  const existing = await Note.findOne({ _id: noteId, deletedAt: null });
  if (!existing) throw formatError(ERR.notFound());

  const { scope } = resolveScope(authContext);
  if (existing.scope !== scope) {
    throw formatError(ERR.notFound());
  }
  if (scope === "internal") {
    ensurePermission(authContext, "notes.update");
    if (String(existing.storeId) !== String(authContext.storeId)) {
      throw formatError(ERR.notFound());
    }
  } else {
    ensurePermission(authContext, "platform.notes.update");
  }

  const payload = sanitizeInput(rawPayload || {});
  if (Object.prototype.hasOwnProperty.call(payload, "content")) {
    existing.content = validateContent(payload.content);
  }
  if (typeof payload.pinned === "boolean") {
    existing.pinned = payload.pinned;
  }
  // entityType / entityId / scope cannot be reassigned via update.

  await existing.save();
  const populated = await Note.findById(existing._id)
    .populate("authorId", "name email")
    .lean({ virtuals: true });

  await audit(authContext, "note.updated", populated, {
    content: existing.isModified("content"),
    pinned: existing.isModified("pinned"),
  });
  return populated;
}

async function softDelete(authContext, noteId) {
  validateObjectId(noteId, "noteId");
  const note = await Note.findOne({ _id: noteId, deletedAt: null });
  if (!note) throw formatError(ERR.notFound());

  const { scope } = resolveScope(authContext);
  if (note.scope !== scope) {
    throw formatError(ERR.notFound());
  }
  if (scope === "internal") {
    ensurePermission(authContext, "notes.delete");
    if (String(note.storeId) !== String(authContext.storeId)) {
      throw formatError(ERR.notFound());
    }
  } else {
    ensurePermission(authContext, "platform.notes.delete");
  }

  note.deletedAt = new Date();
  note.archived = true;
  await note.save();

  await audit(authContext, "note.deleted", note);
  return { id: noteId, deletedAt: note.deletedAt };
}

async function setPinned(authContext, noteId, pinned) {
  if (typeof pinned !== "boolean") {
    throw formatError(ERR.validation("pinned must be a boolean"));
  }
  validateObjectId(noteId, "noteId");
  const note = await Note.findOne({ _id: noteId, deletedAt: null });
  if (!note) throw formatError(ERR.notFound());

  const { scope } = resolveScope(authContext);
  if (note.scope !== scope) {
    throw formatError(ERR.notFound());
  }
  if (scope === "internal") {
    ensurePermission(authContext, "notes.pin");
    if (String(note.storeId) !== String(authContext.storeId)) {
      throw formatError(ERR.notFound());
    }
  } else {
    ensurePermission(authContext, "platform.notes.pin");
  }

  const wasPinned = note.pinned;
  note.pinned = pinned;
  await note.save();

  await audit(authContext, pinned ? "note.pinned" : "note.unpinned", note, {
    wasPinned,
  });
  return note;
}

module.exports = {
  list,
  getById,
  create,
  update,
  softDelete,
  setPinned,
  // exported for tests
  _internal: {
    sanitizeInput,
    validateContent,
    validateEntityType,
    parsePagination,
    resolveScope,
    MAX_CONTENT_LENGTH,
    VALID_ENTITY_TYPES,
  },
};
