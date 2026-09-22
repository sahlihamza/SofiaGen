const logger = require("../config/logger");

/**
 * errorMiddleware  single error response shape across every API route.
 *
 * Response shape (stable for the admin frontend):
 *   { success: false, message: "..." }
 *
 * Status code resolution:
 *   - err.status    use it (controllers can throw `res.status(404).json(...)`
 *                   patterns or use a custom HttpError class)
 *   - err.httpStatus   use it (matches the project's existing convention)
 *   - 400 by default, except CORS_ORIGIN_DENIED which is 403
 *
 * Side effects:
 *   - Logs the full stack at `error` level (>= 500) or `warn` (4xx).
 *   - Sets `req._errorLogged` to prevent double-logging when an upstream
 *     middleware has already captured the error.
 *
 * Usage (in app.js):
 *   const { errorMiddleware } = require("./middleware/errorHandler");
 *   app.use(errorMiddleware);
 */
const errorMiddleware = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  // CORS rejection (kept consistent with the legacy handler in app.js)
  let status =
    err.status ||
    err.httpStatus ||
    (err.code === "CORS_ORIGIN_DENIED" ? 403 : 400);

  // Validation errors (mongoose, joi, express-validator)  400/422
  if (err.name === "ValidationError" || err.name === "CastError") {
    status = err.status || 400;
  }
  if (err.code === 11000) {
    // MongoDB duplicate key
    status = 409;
  }

  // Log once. We use warn for 4xx (client problem) and error for 5xx.
  if (!req._errorLogged) {
    if (status >= 500) logger.error(`[api] ${req.method} ${req.originalUrl}  ${status}: ${err.message}`);
    else logger.warn(`[api] ${req.method} ${req.originalUrl}  ${status}: ${err.message}`);
    req._errorLogged = true;
  }

  const payload = {
    success: false,
    message: err.message || "Internal server error",
  };

  // Optional: surface validation details when present
  if (err.errors && typeof err.errors === "object") {
    payload.errors = err.errors;
  }

  res.status(status).json(payload);
};

module.exports = { errorMiddleware };
