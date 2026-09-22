const CustomerSessionService = require("../service/CustomerSessionService");

// Behind a proxy this needs app.set("trust proxy", 1) to report the real client.
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return req.body?.token || null;
};

const addSession = async (req, res) => {
  try {
    const session = await CustomerSessionService.createSession({
      ...req.body,
      ip: req.body.ip || getClientIp(req),
      userAgent: req.body.userAgent || req.headers["user-agent"],
    });
    res.send({ data: session, message: "Session created successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getSessionsByCustomer = async (req, res) => {
  try {
    const sessions = await CustomerSessionService.getSessionsByCustomer(
      req.params.customerId,
      req.query
    );
    res.send(sessions);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await CustomerSessionService.getSessionById(req.params.id);

    if (!session) {
      return res.status(404).send({ message: "Session Not Found!" });
    }

    res.send(session);
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

// Déconnexion forcé d'une session.
const revokeSession = async (req, res) => {
  try {
    const session = await CustomerSessionService.revokeSession(req.params.id);

    if (!session) {
      return res.status(404).send({ message: "Session Not Found!" });
    }

    res.send({ message: "Session revoked successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

// Déconnexion forcé de toutes les sessions d'un client.
const revokeAllSessions = async (req, res) => {
  try {
    const result = await CustomerSessionService.revokeAllSessions(
      req.params.customerId,
      { exceptToken: req.body?.exceptToken }
    );

    res.send({
      deletedCount: result.deletedCount,
      message: "Sessions revoked successfully!",
    });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

// Logout of the current device: drops the session behind the presented token.
const logout = async (req, res) => {
  try {
    await CustomerSessionService.revokeSessionByToken(getBearerToken(req));
    res.send({ message: "Logged out successfully!" });
  } catch (err) {
    res.status(err.statusCode || 500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addSession,
  getSessionsByCustomer,
  getSessionById,
  revokeSession,
  revokeAllSessions,
  logout,
};
