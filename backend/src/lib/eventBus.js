const { EventEmitter } = require("events");
const logger = require("../config/logger");

class NotificationEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Emits a scoped event with namespace isolation.
   *
   * Format: `${scope}:${eventName}` (e.g. "store:123:payment.created")
   * Also emits on the "*" wildcard so generic listeners can observe all events.
   *
   * @param {string} scope - Tenant/user scope (e.g. "store:123", "user:456").
   * @param {string} eventName - The domain event name.
   * @param {Object} payload - Event payload.
   */
  emitScoped(scope, eventName, payload = {}) {
    const fullEvent = `${scope}:${eventName}`;

    try {
      this.emit(fullEvent, payload);
      // Wildcard emission for generic catch-all listeners.
      this.emit("*", { scope, eventName, payload });
    } catch (err) {
      logger.error(`eventBus: listener for "${fullEvent}" threw: ${err.message}`);
    }
  }

  /**
   * Emits a store-scoped event.
   * Example: eventBus.emitForStore("123", "payment.created", payload)
   *           listens on "store:123:payment.created"
   */
  emitForStore(storeId, eventName, payload = {}) {
    if (!storeId) {
      logger.warn(`eventBus: emitForStore called without storeId for event "${eventName}"`);
      return;
    }
    this.emitScoped(`store:${storeId}`, eventName, payload);
  }

  /**
   * Emits a user-scoped event.
   * Example: eventBus.emitForUser("456", "notification.received", payload)
   *           listens on "user:456:notification.received"
   */
  emitForUser(userId, eventName, payload = {}) {
    if (!userId) {
      logger.warn(`eventBus: emitForUser called without userId for event "${eventName}"`);
      return;
    }
    this.emitScoped(`user:${userId}`, eventName, payload);
  }
}

const eventBus = new NotificationEventBus();

/**
 * Emits an unscoped event (backward-compatible with existing listeners).
 * New code should prefer emitForStore / emitForUser for tenant isolation.
 */
const emitEvent = (eventName, payload = {}) => {
  try {
    eventBus.emit(eventName, payload);
  } catch (err) {
    logger.error(`eventBus: listener for "${eventName}" threw: ${err.message}`);
  }
};

module.exports = {
  eventBus,
  emitEvent,
};
