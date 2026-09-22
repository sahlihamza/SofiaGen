require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const setupRoutes = require("./routes");
const cookieParser = require("cookie-parser");
const requestId = require("./middleware/requestId");
const apiLogger = require("./middleware/apiLogger");
const { errorMiddleware } = require("./middleware/errorHandler");
const logger = require("./config/logger");

const app = express();

/*
 * CSRF Protection Note:
 * This API is designed as a token-based API (JWT in Authorization header).
 * State-changing requests require a valid Bearer token, not cookies alone.
 * CSRF attacks rely on the browser automatically attaching cookies to requests.
 * Since this API does not rely solely on cookies for authentication,
 * and CORS is configured to restrict cross-origin requests,
 * CSRF token middleware is not currently implemented.
 *
 * If the auth model changes to cookie-only sessions, add csurf middleware.
 */

const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests like curl or server-to-server
    // Allow explicit whitelist
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    // Allow any localhost/127.0.0.1 with any port only in development
    if (process.env.NODE_ENV !== "production") {
      try {
        const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
        if (localhostPattern.test(origin)) return callback(null, true);
      } catch (e) {
        // continue to deny
      }
    }
    const err = new Error("Not allowed by CORS");
    err.code = "CORS_ORIGIN_DENIED";
    console.warn("CORS origin denied:", origin);
    return callback(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(express.json({ limit: "4mb", charset: "utf-8" }));
app.use(express.urlencoded({ extended: true, charset: "utf-8" }));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// Ensure every text-based response is served with UTF-8 charset. Express 4.x
// only adds charset automatically when using res.set()/res.type(), not when
// res.setHeader() is called directly  so we intercept the low-level
// setHeader to cover both code paths across the 100+ controllers in this app.
const TEXT_MIME_PREFIXES = ["text/", "application/json", "application/xml", "application/javascript", "application/csv", "application/xml-external"];
const hasCharset = (value) => /;\s*charset\s*=/i.test(value);
const addUtf8Charset = (value) => (hasCharset(value) ? value : `${value}; charset=utf-8`);
app.use((req, res, next) => {
  const originalSetHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === "content-type" && typeof value === "string" && !hasCharset(value)) {
      const mimeType = value.split(";")[0].trim().toLowerCase();
      if (TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p) || mimeType === "application/json" || mimeType === "application/xml")) {
        value = addUtf8Charset(value);
      }
    }
    return originalSetHeader.call(this, name, value);
  };
  next();
});
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(requestId);
app.use(apiLogger);

setupRoutes(app);

// Centralised error middleware (replaces the per-controller try/catch
// pattern; see lib/asyncHandler.js for the wrapper used by controllers).
app.use(errorMiddleware);
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const isOperational = typeof err.status === "number" && err.status < 500;
  const status = err.status || (err.code === "CORS_ORIGIN_DENIED" ? 403 : 500);
  const code = err.code || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");

  if (status >= 500) {
    logger.error("Unhandled error", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      storeId: req.currentStoreId || req.authContext?.storeId || null,
      userId: req.userId || req.user?._id || null,
      status,
      code,
      message: err.message,
      stack: err.stack,
    });
  }

  const message =
    !isOperational && process.env.NODE_ENV === "production"
      ? "Une erreur interne est survenue."
      : err.message;

  res.status(status).json({
    success: false,
    message,
    code,
    requestId: req.requestId,
  });
});

// Serve static files from the "dist" directory
app.use("/static", express.static("public", { charset: "utf-8" }));
app.use("/invoices", express.static(path.join(__dirname, "../invoices"), { charset: "utf-8" }));

// Explicit 404 for undefined API routes before the SPA catch-all
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "Route not found" });
  }
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

module.exports = app;
