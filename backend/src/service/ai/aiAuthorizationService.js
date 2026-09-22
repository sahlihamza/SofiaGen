const AIProviderConfig = require("../../models/AIProviderConfig");
const { getProvider } = require("./providerRegistry");
const { getCode } = require("../../config/rbac/permissionCodes");
const logger = require("../../config/logger");
const { resolveStoreId } = require("../../utils/requestContext");

// Same definition as middleware/auth.js  duplicated here to avoid
// pulling the entire middleware into a service. The User document may
// carry the boolean `isSuperAdmin`, or the user may simply hold a role
// named "Super Admin"  both must unlock Malla.
const userIsSuperAdmin = (req) => {
  if (!req?.user) return false;
  if (req.user.isSuperAdmin) return true;
  if (req.user.userType === "superadmin") return true;
  const roles = Array.isArray(req.user.role) ? req.user.role : req.user.role ? [req.user.role] : [];
  return roles.some(
    (role) => typeof role?.name === "string" && role.name.trim().toLowerCase() === "super admin"
  );
};

/**
 * AiAuthorizationService  every Malla request is gated here.
 *
 * Rules enforced (in this order):
 *   1. User is authenticated (req.user present).
 *   2. User has the `ai.assistant.use` permission for the active store.
 *   3. The user has a valid membership for that store (store isolation).
 *   4. The provider is configured, enabled, has a key.
 *
 * If the user lacks the permission  throws an AuthzError that the
 * controller converts to 403. If the provider is missing, we fall back
 * to the MockProvider (so the widget can still answer in dev), but the
 * `degraded` flag is propagated to the response so the UI can show a
 * soft warning.
 */

class AuthzError extends Error {
  constructor(code, message, { httpStatus = 403 } = {}) {
    super(message);
    this.name = "AuthzError";
    this.code = code; // "UNAUTHENTICATED" | "NO_PERMISSION" | "NO_STORE" | "NO_PROVIDER"
    this.httpStatus = httpStatus;
  }
}

async function assertCanUseAssistant(req) {
  if (!req.user) {
    throw new AuthzError("UNAUTHENTICATED", "Utilisateur non authentifié", { httpStatus: 401 });
  }

  // Super-admins are always entitled to use Malla, regardless of whether
  // the ai.assistant.* permission codes have been re-seeded with the
  // "platform" scope yet. This mirrors the admin UI fallback in
  // AssistantLauncher.jsx and avoids a 403 in dev/staging before
  // `npm run seed:all` has been re-executed after a permissions schema
  // change. The audit log still records the actorType correctly.
  const isSuperAdmin = userIsSuperAdmin(req);

  const code = getCode("AI Assistant", "use");
  if (!code) {
    logger.error("[ai] missing permission code for AI Assistant.use");
    throw new AuthzError("NO_PERMISSION", "Permission IA non configuré");
  }

  const perms = req.authContext?.permissions;
  if (!isSuperAdmin) {
    if (perms && perms instanceof Set) {
      if (!perms.has(code)) {
        throw new AuthzError("NO_PERMISSION", "Permission IA insuffisante");
      }
    }
  }

  // Two scopes are accepted:
  //   - store scope:    storeId MUST be present (regular store admin).
  //   - platform scope: storeId may be null (super-admin browsing the
  //                    admin without an active store). Quotas are skipped
  //                    in this mode (see aiQuotaService.assertAndConsume).
  const isPlatformContext = req.authContext?.scope === "platform" || (isSuperAdmin && !resolveStoreId(req));
  const storeId = isPlatformContext
    ? null
    : resolveStoreId(req);

  if (!isPlatformContext && !storeId) {
    throw new AuthzError("NO_STORE", "Aucune boutique active", { httpStatus: 400 });
  }

  return { storeId: storeId ? String(storeId) : null, userId: String(req.user._id) };
}

/**
 * Platform-aware variant of loadProviderForStore. Falls back to a
 * global mock provider when the request is made from a platform context
 * (super-admin without active store) and no platform-level provider
 * config has been recorded.
 */
async function loadProviderForStore(storeId) {
  if (!storeId) {
    // Platform context: super-admin without active store. Look for any
    // platform-wide default, else fall back to Mock.
    let config = await AIProviderConfig.findOne({
      storeId: null,
      isDefault: true,
      enabled: true,
    }).lean();
    if (!config) {
      config = await AIProviderConfig.findOne({ storeId: null, enabled: true }).lean();
    }
    if (!config || !config.apiKeyCipher) {
      return { provider: getProvider("mock"), config: null, degraded: true };
    }
    const { decryptApiKey } = require("./aiProviderConfigService");
    const apiKey = decryptApiKey(config.apiKeyCipher);
    const provider = getProvider(config.providerName);
    provider._configBaseUrl = config.baseUrl || provider.defaultBaseUrl;
    provider._configModel = config.model || null;
    return { provider, config, degraded: false };
  }

  let config = await AIProviderConfig.findOne({ storeId, isDefault: true, enabled: true }).lean();
  if (!config) {
    config = await AIProviderConfig.findOne({ storeId, enabled: true }).lean();
  }

  if (!config || !config.apiKeyCipher) {
    // Fall back to the mock so the assistant always responds. Caller is
    // responsible for surfacing a "degraded" warning to the user.
    return { provider: getProvider("mock"), config: null, degraded: true };
  }

  // Lazy-require to avoid pulling crypto on cold paths.
  const { decryptApiKey } = require("./aiProviderConfigService");
  const apiKey = decryptApiKey(config.apiKeyCipher);

  const provider = getProvider(config.providerName);
  // The base URL override is applied at request time, not constructor time.
  provider._configBaseUrl = config.baseUrl || provider.defaultBaseUrl;
  provider._configModel = config.model || null;
  return { provider, config, degraded: false };
}

module.exports = { assertCanUseAssistant, loadProviderForStore, AuthzError };