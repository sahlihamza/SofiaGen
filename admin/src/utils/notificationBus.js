const EVENT_NAME = "notif:unread-count-change";

export const emitUnreadCountChange = ({ delta = 0, reset = false } = {}) => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { delta, reset } }));
};

export const onUnreadCountChange = (handler) => {
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};
