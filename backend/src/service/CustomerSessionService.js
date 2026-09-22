const crypto = require("crypto");
const CustomerSession = require("../models/CustomerSession");
const Customer = require("../models/Customer");

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

// Sessions live for 30 days unless the caller knows the token's real expiry.
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// The collection stores digests, so a leaked dump cannot be replayed.
const hashToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

// Small user-agent reader: enough to fill the "Device / Browser" columns
// without pulling in a parsing dependency.
const parseUserAgent = (userAgent = "") => {
  const ua = String(userAgent);

  const browsers = [
    [/Edg[eA-Z]*\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)|Opera/, "Opera"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
  ];

  let browser = "Unknown";
  for (const [pattern, label] of browsers) {
    if (pattern.test(ua)) {
      browser = label;
      break;
    }
  }

  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let kind = "Desktop";
  if (/iPad|Tablet/i.test(ua)) kind = "Tablet";
  else if (/Mobi|Android|iPhone/i.test(ua)) kind = "Mobile";

  return { browser, device: `${kind} (${os})` };
};

const loadLiveCustomer = async (customerId) => {
  const customer = await Customer.findOne({ _id: customerId, deletedAt: null });
  if (!customer) {
    throw httpError(404, "Client introuvable.");
  }
  return customer;
};

// Called on login. Registers the session and stamps the customer's lastLogin.
const createSession = async (data = {}) => {
  if (!data.customerId) {
    throw httpError(400, "customerId est obligatoire.");
  }
  if (!data.token) {
    throw httpError(400, "token est obligatoire.");
  }

  const customer = await loadLiveCustomer(data.customerId);

  // Explicit browser/device win; otherwise read them off the user-agent.
  const parsed = parseUserAgent(data.userAgent);
  const now = new Date();

  const session = new CustomerSession({
    customerId: customer._id,
    // The session always lives in the same boutique as its customer.
    storeId: customer.storeId,
    token: hashToken(data.token),
    ip: data.ip,
    browser: data.browser || parsed.browser,
    device: data.device || parsed.device,
    lastLogin: now,
    expiresAt: data.expiresAt
      ? new Date(data.expiresAt)
      : new Date(now.getTime() + DEFAULT_TTL_MS),
  });

  await session.save();

  // Story 1 keeps lastLogin on the customer itself for the listing screens.
  await Customer.updateOne({ _id: customer._id }, { $set: { lastLogin: now } });

  return session;
};

// Active sessions of a customer: last login, IP, device, browser.
const getSessionsByCustomer = async (customerId, { includeExpired } = {}) => {
  const queryObject = { customerId };

  // The TTL monitor runs about once a minute, so filter explicitly too.
  if (includeExpired !== true && includeExpired !== "true") {
    queryObject.expiresAt = { $gt: new Date() };
  }

  return CustomerSession.find(queryObject).sort({ lastLogin: -1, _id: -1 });
};

const getSessionById = async (id) => {
  return CustomerSession.findById(id);
};

// Resolves a raw token to its live session, for auth middleware.
const getSessionByToken = async (token) => {
  if (!token) return null;

  return CustomerSession.findOne({
    token: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
};

// Refreshes lastLogin on each authenticated request.
const touchSession = async (token) => {
  if (!token) return null;

  return CustomerSession.findOneAndUpdate(
    { token: hashToken(token), expiresAt: { $gt: new Date() } },
    { $set: { lastLogin: new Date() } },
    { new: true }
  );
};

// Déconnexion forcé: kill one session by id.
const revokeSession = async (id) => {
  const session = await CustomerSession.findById(id);
  if (!session) return null;

  await CustomerSession.deleteOne({ _id: session._id });

  return session;
};

// Normal logout: kill the session behind the presented token.
const revokeSessionByToken = async (token) => {
  if (!token) return null;

  return CustomerSession.findOneAndDelete({ token: hashToken(token) });
};

// Déconnexion forcé, everywhere. Pass exceptToken to keep the current device
// signed in ("log out all other devices").
const revokeAllSessions = async (customerId, { exceptToken } = {}) => {
  const query = { customerId };
  if (exceptToken) {
    query.token = { $ne: hashToken(exceptToken) };
  }

  return CustomerSession.deleteMany(query);
};

// Called when a customer is permanently erased.
const deleteSessionsByCustomer = async (customerId) => {
  return CustomerSession.deleteMany({ customerId });
};

module.exports = {
  createSession,
  getSessionsByCustomer,
  getSessionById,
  getSessionByToken,
  touchSession,
  revokeSession,
  revokeSessionByToken,
  revokeAllSessions,
  deleteSessionsByCustomer,
  hashToken,
  parseUserAgent,
};
