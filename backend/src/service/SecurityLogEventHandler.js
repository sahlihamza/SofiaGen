const { eventBus } = require("../lib/eventBus");
const SecurityLogService = require("./SecurityLogService");

// SECURITY-LOG-1: bridges the existing security.* events (already emitted by
// userController.js for login/failed login/password change) into the
// dedicated SecurityLog collection, decoupled from the controllers
// themselves  same pattern as NotificationEventHandler.
const EVENT_TO_SECURITY_EVENT = {
  "security.new_login": "login",
  "security.failed_login": "failed_login",
  "security.password_changed": "password_changed",
  "security.logout": "logout",
  "security.2fa_enabled": "2fa_enabled",
  "security.2fa_disabled": "2fa_disabled",
  "security.session_revoked": "session_revoked",
  "security.permission_changed": "permission_changed",
  "security.role_changed": "role_changed",
  "security.impersonation_started": "impersonation_started",
  "security.impersonation_ended": "impersonation_ended",
};

const registerSecurityLogHandlers = () => {
  for (const [eventName, securityEvent] of Object.entries(EVENT_TO_SECURITY_EVENT)) {
    eventBus.on(eventName, (payload = {}) => {
      SecurityLogService.log({
        event: securityEvent,
        userId: payload.userId,
        email: payload.email,
        storeId: payload.storeId,
        ip: payload.metadata?.ipAddress || payload.ip,
        userAgent: payload.metadata?.userAgent || payload.userAgent,
        requestId: payload.requestId,
        metadata: payload.metadata || {},
      }).catch(() => {});
    });
  }
};

module.exports = { registerSecurityLogHandlers };
