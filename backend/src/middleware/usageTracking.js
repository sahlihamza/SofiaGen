const { decrementQuota } = require("./quotaMiddleware");
const logger = require("../config/logger");
const { resolveStoreId } = require("../utils/requestContext");

/**
 * Décrémente automatiquement un quota aprés une action DELETE.
 *
 * Usage :
 *   router.delete("/products/:id", isAuth, loadUser, decrementAfterDelete("products"), controller);
 */
function decrementAfterDelete(quotaTypeCode, options = {}) {
  const { amount = 1 } = options;

  return async (req, res, next) => {
    req._decrementQuota = async () => {
      try {
        const storeId = resolveStoreId(req);
        if (storeId) {
          await decrementQuota({ storeId, quotaTypeCode, amount });
        }
      } catch (err) {
        logger.warn(`Failed to decrement quota ${quotaTypeCode}: ${err.message}`);
      }
    };
    next();
  };
}

/**
 * Wrapper pour exécuter un handler puis décrémenter le quota en cas de succès.
 */
function withQuotaDecrement(quotaTypeCode, handler, options = {}) {
  const { amount = 1 } = options;

  return async (req, res, next) => {
    try {
      await handler(req, res, next);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const storeId = resolveStoreId(req);
        if (storeId) {
          await decrementQuota({ storeId, quotaTypeCode, amount });
        }
      }
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  decrementAfterDelete,
  withQuotaDecrement,
};
