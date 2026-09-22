/**
 * Tests for the internal Notes feature.
 *
 * These are integration tests that require a running MongoDB (test DB).
 * They use a real DB connection rather than mocks because the multi-tenant
 * isolation logic + indexes + audit log pipeline need real Mongoose plumbing
 * to be meaningful.
 *
 * Run with:
 *   MONGO_URI=mongodb://localhost:27017/sofiagen_test_notes \
 *   npx jest tests/notes.test.js
 *
 * The suite is auto-skipped if MongoDB is not reachable.
 */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI_NOTES ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/sofiagen_test_notes";

const Note = require("../src/models/Note");
const NoteService = require("../src/service/NoteService");
const AuditService = require("../src/service/AuditService");

// --- helpers ----------------------------------------------------------------

let mongoReachable = false;

beforeAll(async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 1500 });
    mongoReachable = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[notes.test] MongoDB unreachable at ${MONGO_URI} — skipping.`);
    mongoReachable = false;
  }
});

afterAll(async () => {
  if (mongoReachable) {
    await mongoose.connection.close();
  }
});

const eachTest = mongoReachable ? test : test.skip;

function newAuthContext({ storeId, userId, permissions }) {
  return {
    userId,
    user: { name: "Test User" },
    storeId,
    role: { name: "store_admin" },
    permissions: new Set(permissions || []),
    ip: "127.0.0.1",
    userAgent: "jest",
  };
}

function makeStoreId() {
  return new mongoose.Types.ObjectId();
}

function makeUserId() {
  return new mongoose.Types.ObjectId();
}

function makeEntityId() {
  return new mongoose.Types.ObjectId();
}

// Silence the audit logger in tests to keep the output clean.
beforeEach(() => {
  jest.spyOn(AuditService, "logAction").mockResolvedValue({});
});

afterEach(async () => {
  if (mongoReachable) {
    await Note.deleteMany({});
  }
  jest.restoreAllMocks();
});

// --- helpers end ------------------------------------------------------------

describe("Note model — schema", () => {
  eachTest("rejects missing required fields", async () => {
    await expect(Note.create({})).rejects.toThrow();
    await expect(
      Note.create({ content: "hi" })
    ).rejects.toThrow();
  });

  eachTest("rejects unknown entityType", async () => {
    await expect(
      Note.create({
        storeId: makeStoreId(),
        authorId: makeUserId(),
        entityType: "unknown",
        entityId: makeEntityId(),
        content: "x",
      })
    ).rejects.toThrow();
  });

  eachTest("rejects content > 5000 chars", async () => {
    await expect(
      Note.create({
        storeId: makeStoreId(),
        authorId: makeUserId(),
        entityType: "order",
        entityId: makeEntityId(),
        content: "x".repeat(5001),
      })
    ).rejects.toThrow();
  });

  eachTest("accepts valid payload", async () => {
    const note = await Note.create({
      storeId: makeStoreId(),
      authorId: makeUserId(),
      entityType: "order",
      entityId: makeEntityId(),
      content: "valid note",
    });
    expect(note._id).toBeDefined();
    expect(note.visibility).toBe("internal");
    expect(note.pinned).toBe(false);
    expect(note.deletedAt).toBeNull();
  });
});

describe("NoteService.create", () => {
  eachTest("creates a note with server-controlled authorId and storeId", async () => {
    const storeId = makeStoreId();
    const authorId = makeUserId();
    const ctx = newAuthContext({ storeId, userId: authorId, permissions: ["notes.create"] });

    const note = await NoteService.create(ctx, {
      content: "Client préfère WhatsApp",
      entityType: "customer",
      entityId: makeEntityId(),
      pinned: true,
    });

    expect(note.content).toBe("Client préfère WhatsApp");
    expect(note.authorId.toString()).toBe(authorId.toString());
    expect(note.storeId.toString()).toBe(storeId.toString());
    expect(note.pinned).toBe(true);
  });

  eachTest("ignores client-supplied authorId and storeId", async () => {
    const storeId = makeStoreId();
    const authorId = makeUserId();
    const ctx = newAuthContext({ storeId, userId: authorId, permissions: ["notes.create"] });

    const forgedAuthor = makeUserId();
    const forgedStore = makeStoreId();

    const note = await NoteService.create(ctx, {
      content: "forged attempt",
      entityType: "order",
      entityId: makeEntityId(),
      authorId: forgedAuthor,
      storeId: forgedStore,
    });

    expect(note.authorId.toString()).toBe(authorId.toString());
    expect(note.storeId.toString()).toBe(storeId.toString());
    expect(note.authorId.toString()).not.toBe(forgedAuthor.toString());
    expect(note.storeId.toString()).not.toBe(forgedStore.toString());
  });

  eachTest("rejects when content is missing", async () => {
    const ctx = newAuthContext({
      storeId: makeStoreId(),
      userId: makeUserId(),
      permissions: ["notes.create"],
    });
    await expect(
      NoteService.create(ctx, {
        entityType: "order",
        entityId: makeEntityId(),
      })
    ).rejects.toMatchObject({ status: 422, code: "NOTE_VALIDATION" });
  });

  eachTest("rejects when entityType is invalid", async () => {
    const ctx = newAuthContext({
      storeId: makeStoreId(),
      userId: makeUserId(),
      permissions: ["notes.create"],
    });
    await expect(
      NoteService.create(ctx, {
        content: "x",
        entityType: "spaceship",
        entityId: makeEntityId(),
      })
    ).rejects.toMatchObject({ status: 422, code: "NOTE_VALIDATION" });
  });

  eachTest("rejects when entityId is not an ObjectId", async () => {
    const ctx = newAuthContext({
      storeId: makeStoreId(),
      userId: makeUserId(),
      permissions: ["notes.create"],
    });
    await expect(
      NoteService.create(ctx, {
        content: "x",
        entityType: "order",
        entityId: "not-an-objectid",
      })
    ).rejects.toMatchObject({ status: 422 });
  });

  eachTest("rejects when notes.create is missing", async () => {
    const ctx = newAuthContext({
      storeId: makeStoreId(),
      userId: makeUserId(),
      permissions: [],
    });
    await expect(
      NoteService.create(ctx, {
        content: "x",
        entityType: "order",
        entityId: makeEntityId(),
      })
    ).rejects.toMatchObject({ status: 403, code: "NOTE_PERMISSION_DENIED" });
  });
});

describe("NoteService.list", () => {
  eachTest("filters by entityType + entityId and excludes archived", async () => {
    const storeId = makeStoreId();
    const authorId = makeUserId();
    const ctx = newAuthContext({ storeId, userId: authorId, permissions: ["notes.view"] });

    const orderId = makeEntityId();
    await Note.create({
      storeId, authorId, entityType: "order", entityId: orderId, content: "a",
    });
    await Note.create({
      storeId, authorId, entityType: "order", entityId: orderId, content: "b",
    });
    await Note.create({
      storeId, authorId, entityType: "customer", entityId: makeEntityId(), content: "c",
    });
    // soft-deleted one
    const tomb = await Note.create({
      storeId, authorId, entityType: "order", entityId: orderId, content: "d",
    });
    tomb.deletedAt = new Date();
    await tomb.save();

    const result = await NoteService.list(ctx, { entityType: "order", entityId: orderId.toString() });
    expect(result.pagination.total).toBe(2);
    expect(result.data.every((n) => n.entityId.toString() === orderId.toString())).toBe(true);
  });

  eachTest("puts pinned notes first", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.view"] });
    const orderId = makeEntityId();
    const a = await Note.create({ storeId, authorId: makeUserId(), entityType: "order", entityId: orderId, content: "a" });
    await new Promise((r) => setTimeout(r, 5));
    const b = await Note.create({ storeId, authorId: makeUserId(), entityType: "order", entityId: orderId, content: "b" });
    b.pinned = true;
    await b.save();
    const c = await Note.create({ storeId, authorId: makeUserId(), entityType: "order", entityId: orderId, content: "c" });

    const result = await NoteService.list(ctx, { entityType: "order", entityId: orderId.toString() });
    expect(result.data[0]._id.toString()).toBe(b._id.toString());
    expect(result.data[0].pinned).toBe(true);
  });

  eachTest("paginates", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.view"] });
    const orderId = makeEntityId();
    for (let i = 0; i < 25; i++) {
      await Note.create({ storeId, authorId: makeUserId(), entityType: "order", entityId: orderId, content: `n${i}` });
    }
    const r1 = await NoteService.list(ctx, { entityType: "order", entityId: orderId.toString(), page: "1", limit: "10" });
    expect(r1.data).toHaveLength(10);
    expect(r1.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
    const r3 = await NoteService.list(ctx, { entityType: "order", entityId: orderId.toString(), page: "3", limit: "10" });
    expect(r3.data).toHaveLength(5);
  });

  eachTest("clamps limit at 100", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view"] });
    const result = await NoteService.list(ctx, { limit: "9999" });
    expect(result.pagination.limit).toBe(100);
  });
});

describe("NoteService.update", () => {
  eachTest("updates content", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.update"] });
    const note = await Note.create({
      storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "before",
    });
    const updated = await NoteService.update(ctx, note._id.toString(), { content: "after" });
    expect(updated.content).toBe("after");
  });

  eachTest("does not change authorId even if requested", async () => {
    const storeId = makeStoreId();
    const authorId = makeUserId();
    const ctx = newAuthContext({ storeId, userId: authorId, permissions: ["notes.update"] });
    const note = await Note.create({
      storeId, authorId, entityType: "order", entityId: makeEntityId(), content: "x",
    });
    const updated = await NoteService.update(ctx, note._id.toString(), {
      authorId: makeUserId().toString(),
    });
    expect(updated.authorId.toString()).toBe(authorId.toString());
  });

  eachTest("returns 404 if note does not exist", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.update"] });
    await expect(
      NoteService.update(ctx, new mongoose.Types.ObjectId().toString(), { content: "x" })
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("NoteService.softDelete", () => {
  eachTest("marks the note archived and sets deletedAt", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.delete"] });
    const note = await Note.create({
      storeId: ctx.storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "x",
    });
    const result = await NoteService.softDelete(ctx, note._id.toString());
    expect(result.deletedAt).toBeInstanceOf(Date);
    const reloaded = await Note.findById(note._id);
    expect(reloaded.deletedAt).not.toBeNull();
    expect(reloaded.archived).toBe(true);
  });

  eachTest("does not appear in subsequent list calls", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view", "notes.delete"] });
    const orderId = makeEntityId();
    const note = await Note.create({
      storeId: ctx.storeId, authorId: makeUserId(), entityType: "order", entityId: orderId, content: "x",
    });
    await NoteService.softDelete(ctx, note._id.toString());
    const result = await NoteService.list(ctx, { entityType: "order", entityId: orderId.toString() });
    expect(result.pagination.total).toBe(0);
  });
});

describe("NoteService.setPinned", () => {
  eachTest("toggles pinned", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.pin"] });
    const note = await Note.create({
      storeId: ctx.storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "x",
    });
    const pinned = await NoteService.setPinned(ctx, note._id.toString(), true);
    expect(pinned.pinned).toBe(true);
    const unpinned = await NoteService.setPinned(ctx, note._id.toString(), false);
    expect(unpinned.pinned).toBe(false);
  });

  eachTest("rejects non-boolean pinned", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.pin"] });
    const note = await Note.create({
      storeId: ctx.storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "x",
    });
    await expect(
      NoteService.setPinned(ctx, note._id.toString(), "true")
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("Multi-tenant isolation", () => {
  eachTest("store A cannot read a note belonging to store B", async () => {
    const storeA = makeStoreId();
    const storeB = makeStoreId();
    const authorB = makeUserId();
    const noteB = await Note.create({
      storeId: storeB, authorId: authorB, entityType: "order", entityId: makeEntityId(), content: "storeB note",
    });
    const ctxA = newAuthContext({ storeId: storeA, userId: makeUserId(), permissions: ["notes.view"] });

    // List scoped to storeA must not see it
    const list = await NoteService.list(ctxA, {});
    expect(list.data.find((n) => n._id.toString() === noteB._id.toString())).toBeUndefined();

    // getById with the actual id must 404 (not 200)
    await expect(
      NoteService.getById(ctxA, noteB._id.toString())
    ).rejects.toMatchObject({ status: 404 });
  });

  eachTest("store A cannot update a note belonging to store B", async () => {
    const storeA = makeStoreId();
    const storeB = makeStoreId();
    const noteB = await Note.create({
      storeId: storeB, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "B",
    });
    const ctxA = newAuthContext({ storeId: storeA, userId: makeUserId(), permissions: ["notes.update"] });
    await expect(
      NoteService.update(ctxA, noteB._id.toString(), { content: "hacked" })
    ).rejects.toMatchObject({ status: 404 });
  });

  eachTest("store A cannot delete a note belonging to store B", async () => {
    const storeA = makeStoreId();
    const storeB = makeStoreId();
    const noteB = await Note.create({
      storeId: storeB, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "B",
    });
    const ctxA = newAuthContext({ storeId: storeA, userId: makeUserId(), permissions: ["notes.delete"] });
    await expect(
      NoteService.softDelete(ctxA, noteB._id.toString())
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("Permission gating", () => {
  eachTest("view requires notes.view", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: [] });
    await expect(NoteService.list(ctx, {})).rejects.toMatchObject({ code: "NOTE_PERMISSION_DENIED" });
  });

  eachTest("create requires notes.create", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view"] });
    await expect(
      NoteService.create(ctx, { content: "x", entityType: "order", entityId: makeEntityId() })
    ).rejects.toMatchObject({ code: "NOTE_PERMISSION_DENIED" });
  });

  eachTest("update requires notes.update", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view"] });
    await expect(
      NoteService.update(ctx, new mongoose.Types.ObjectId().toString(), { content: "x" })
    ).rejects.toMatchObject({ code: "NOTE_PERMISSION_DENIED" });
  });

  eachTest("delete requires notes.delete", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view"] });
    await expect(
      NoteService.softDelete(ctx, new mongoose.Types.ObjectId().toString())
    ).rejects.toMatchObject({ code: "NOTE_PERMISSION_DENIED" });
  });

  eachTest("pin requires notes.pin", async () => {
    const ctx = newAuthContext({ storeId: makeStoreId(), userId: makeUserId(), permissions: ["notes.view"] });
    await expect(
      NoteService.setPinned(ctx, new mongoose.Types.ObjectId().toString(), true)
    ).rejects.toMatchObject({ code: "NOTE_PERMISSION_DENIED" });
  });
});

describe("Audit integration", () => {
  eachTest("create emits note.created with safe metadata", async () => {
    const storeId = makeStoreId();
    const authorId = makeUserId();
    const ctx = newAuthContext({ storeId, userId: authorId, permissions: ["notes.create"] });
    const orderId = makeEntityId();
    const note = await NoteService.create(ctx, {
      content: "audit me",
      entityType: "order",
      entityId: orderId,
    });
    expect(AuditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "note.created",
        module: "Notes",
        entityType: "note",
        entityId: note._id,
        storeId,
        actorId: authorId,
        metadata: expect.objectContaining({ noteEntityType: "order" }),
      })
    );
  });

  eachTest("delete emits note.deleted", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.create", "notes.delete"] });
    const note = await NoteService.create(ctx, {
      content: "x", entityType: "order", entityId: makeEntityId(),
    });
    AuditService.logAction.mockClear();
    await NoteService.softDelete(ctx, note._id.toString());
    expect(AuditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "note.deleted" })
    );
  });

  eachTest("pin emits note.pinned / note.unpinned", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.create", "notes.pin"] });
    const note = await NoteService.create(ctx, {
      content: "x", entityType: "order", entityId: makeEntityId(),
    });
    AuditService.logAction.mockClear();
    await NoteService.setPinned(ctx, note._id.toString(), true);
    expect(AuditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "note.pinned" })
    );
    await NoteService.setPinned(ctx, note._id.toString(), false);
    expect(AuditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "note.unpinned" })
    );
  });
});

describe("Edge cases", () => {
  eachTest("search filter is case-insensitive and escapes regex chars", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.view"] });
    await Note.create({
      storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "Livraison OK",
    });
    const r1 = await NoteService.list(ctx, { search: "livraison" });
    expect(r1.pagination.total).toBe(1);
    const r2 = await NoteService.list(ctx, { search: ".*" });
    // regex special chars must be escaped, not match everything
    expect(r2.pagination.total).toBe(0);
  });

  eachTest("search with < 2 chars is ignored", async () => {
    const storeId = makeStoreId();
    const ctx = newAuthContext({ storeId, userId: makeUserId(), permissions: ["notes.view"] });
    await Note.create({
      storeId, authorId: makeUserId(), entityType: "order", entityId: makeEntityId(), content: "anything",
    });
    const r = await NoteService.list(ctx, { search: "a" });
    expect(r.pagination.total).toBe(1);
  });
});
