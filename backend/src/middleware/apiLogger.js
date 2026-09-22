const SystemLogService = require("../service/SystemLogService");

// LOG-2: records every API request (method, path, status, duration) as a
// SystemLog entry (category: "api"). Never logs the request/response body 
// only metadata  so secrets (password, tokens, card data, webhook
// secrets...) can never leak into logs even by accident.
const SKIP_PATHS = ["/static", "/invoices"];

const apiLogger = (req, res, next) => {
  if (SKIP_PATHS.some((p) => req.path.startsWith(p))) return next();

  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warning" : "info";

    SystemLogService.log({
      level,
      category: "api",
      service: "http",
      message: `${req.method} ${req.originalUrl} -> ${statusCode} (${Math.round(durationMs)}ms)`,
      errorCode: statusCode >= 400 ? `HTTP_${statusCode}` : undefined,
      storeId: req.currentStoreId || undefined,
      userId: req.userId || undefined,
      requestId: req.requestId,
      metadata: {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        durationMs: Math.round(durationMs),
        ip: req.headers["x-forwarded-for"]?.split(",")[0] || req.socket?.remoteAddress,
      },
    }).catch(() => {});
  });

  next();
};

module.exports = apiLogger;
