const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();

const {
  addSession,
  getSessionsByCustomer,
  getSessionById,
  revokeSession,
  revokeAllSessions,
  logout,
} = require("../controller/customerSessionController");

// register a session (called by the login flow)
router.post("/add", addSession);

// register a session (REST style)
router.post("/", addSession);

// logout of the current device
router.post("/logout", logout);

// active sessions of a customer (?includeExpired=true)
router.get("/customer/:customerId", getSessionsByCustomer);

// déconnexion forcé: every session of a customer
router.delete("/customer/:customerId", revokeAllSessions);

// get session by id
router.get("/:id", getSessionById);

// déconnexion forcé: one session
router.delete("/:id", revokeSession);

module.exports = router;
