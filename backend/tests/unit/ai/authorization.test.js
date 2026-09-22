const test = require("node:test");
const assert = require("node:assert/strict");

const { assertCanUseAssistant, AuthzError } = require("../../../src/service/ai/aiAuthorizationService");

function fakeReq({ user = null, storeId = null, perms = null } = {}) {
  return {
    user,
    authContext: {
      storeId,
      userId: user?._id,
      permissions: perms || new Set(),
    },
  };
}

const USE_CODE = "ai.assistant.use";

test("aiAuthorizationService — unauthenticated → 401 UNAUTHENTICATED", async () => {
  await assert.rejects(
    () => assertCanUseAssistant(fakeReq()),
    (err) => {
      assert.ok(err instanceof AuthzError);
      assert.equal(err.code, "UNAUTHENTICATED");
      assert.equal(err.httpStatus, 401);
      return true;
    }
  );
});

test("aiAuthorizationService — no active store → 400 NO_STORE", async () => {
  await assert.rejects(
    () =>
      assertCanUseAssistant(
        fakeReq({ user: { _id: "u1" }, storeId: null, perms: new Set([USE_CODE]) })
      ),
    (err) => err instanceof AuthzError && err.code === "NO_STORE" && err.httpStatus === 400
  );
});

test("aiAuthorizationService — missing permission → 403 NO_PERMISSION", async () => {
  await assert.rejects(
    () =>
      assertCanUseAssistant(
        fakeReq({
          user: { _id: "u1" },
          storeId: "STORE-A",
          perms: new Set(["orders.view"]), // does NOT include ai.assistant.use
        })
      ),
    (err) =>
      err instanceof AuthzError && err.code === "NO_PERMISSION" && err.httpStatus === 403
  );
});

test("aiAuthorizationService — happy path returns store + user", async () => {
  const r = await assertCanUseAssistant(
    fakeReq({
      user: { _id: "user-1" },
      storeId: "STORE-A",
      perms: new Set([USE_CODE]),
    })
  );
  assert.equal(r.storeId, "STORE-A");
  assert.equal(r.userId, "user-1");
});

test("aiAuthorizationService — store isolation: a user with no store at all is rejected", async () => {
  // The orchestrator must never reach a state where it can ask another
  // store's data. The auth context's storeId is the only authoritative
  // source — if it is missing AND the user has no currentStoreId, we
  // 400 the request rather than guess.
  await assert.rejects(
    () =>
      assertCanUseAssistant(
        fakeReq({
          user: { _id: "u1" }, // no currentStoreId either
          storeId: null,
          perms: new Set([USE_CODE]),
        })
      ),
    (err) => err instanceof AuthzError && err.code === "NO_STORE"
  );
});

test("aiAuthorizationService — store isolation: authContext.storeId wins over user.currentStoreId", async () => {
  // When the request carries an explicit store context (e.g. superadmin
  // browsing another store), that is the source of truth — the user's
  // own currentStoreId on the document must not silently override it.
  const r = await assertCanUseAssistant(
    fakeReq({
      user: { _id: "u1", currentStoreId: "STORE-USER-OWN" },
      storeId: "STORE-EXPLICIT-CONTEXT",
      perms: new Set([USE_CODE]),
    })
  );
  assert.equal(r.storeId, "STORE-EXPLICIT-CONTEXT");
});