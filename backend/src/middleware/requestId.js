const crypto = require("crypto");

// LOG-7: every request gets a correlation id, reused if the caller already
// supplied one (X-Request-ID) so a client/gateway-generated id survives.
// Every audit entry, log entry, webhook call and job triggered while
// handling this request should carry req.requestId so the Super Admin can
// trace the full chain: API request -> controller -> DB -> payment ->
// webhook -> notification -> email.
const requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id = (typeof incoming === "string" && incoming.trim()) || crypto.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
};

module.exports = requestId;
