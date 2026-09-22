/**
 * Request-scoped context resolvers. These were duplicated 30+ times
 * across controllers and middleware, sometimes with subtle differences
 * that caused silent bugs (e.g. brandController/attributeController
 * dropping `req.currentStoreId`).
 *
 * Use these helpers everywhere instead of inlining the lookup.
 */

/**
 * Resolve the active storeId from the request. Priority order matches
 * the rest of the codebase: explicit auth context  currentStoreId on
 * the user  legacy `req.currentStoreId` shortcut.
 *
 * Returns the storeId as a string, or null if none is resolvable.
 */
function resolveStoreId(req) {
  if (!req) return null;
  if (req.authContext && req.authContext.storeId) return String(req.authContext.storeId);
  if (req.user && req.user.currentStoreId) return String(req.user.currentStoreId);
  if (req.currentStoreId) return String(req.currentStoreId);
  return null;
}

/**
 * Resolve the authenticated user id from the request. Returns null
 * if the user is not authenticated.
 */
function resolveUserId(req) {
  if (!req) return null;
  if (req.user && req.user._id) return String(req.user._id);
  return null;
}

/**
 * Resolve the full auth context shape `{ storeId, userId, scope, permissions }`.
 * Returns an empty object if the request has no auth context.
 */
function resolveAuthContext(req) {
  return {
    storeId: resolveStoreId(req),
    userId: resolveUserId(req),
    scope: (req && req.authContext && req.authContext.scope) || null,
    permissions: (req && req.authContext && req.authContext.permissions) || null,
  };
}

module.exports = {
  resolveStoreId,
  resolveUserId,
  resolveAuthContext,
};
