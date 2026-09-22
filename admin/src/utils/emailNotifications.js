export const DEFAULT_EMAIL_NOTIFICATION_TEXT = {
  new_order: {
    title: "New order",
    description: "Sent to the store admin when a new order is received.",
  },
  cancelled_order: {
    title: "Cancelled order",
    description: "Sent to the store admin when an order is cancelled.",
  },
  failed_order: {
    title: "Failed order",
    description: "Sent to the store admin when an order payment fails.",
  },
  order_on_hold: {
    title: "Order on-hold",
    description:
      "Sent to the customer when an order is placed on hold awaiting payment.",
  },
  processing_order: {
    title: "Processing order",
    description:
      "Sent to the customer when payment is confirmed and the order is being processed.",
  },
  completed_order: {
    title: "Completed order",
    description:
      "Sent to the customer when the order is marked complete, usually indicating it has been shipped.",
  },
  refunded_order: {
    title: "Refunded order",
    description: "Sent to the customer when an order is refunded.",
  },
  customer_invoice: {
    title: "Customer invoice / Order details",
    description:
      "Sent to the customer containing order information and payment links.",
  },
  customer_note: {
    title: "Customer note",
    description: "Sent to the customer when a note is added to their order.",
  },
  reset_password: {
    title: "Reset password",
    description: "Sent to the customer when they request a password reset.",
  },
  new_account: {
    title: "New account",
    description:
      "Sent to the customer when they create a new account on the store.",
  },
};

const isUntouchedDefault = (value, key, field) =>
  value === DEFAULT_EMAIL_NOTIFICATION_TEXT[key]?.[field];

export const getEmailNotificationDisplayText = (notification, t) => {
  const title = isUntouchedDefault(notification.title, notification.key, "title")
    ? t(`EmailNotifTitle_${notification.key}`)
    : notification.title;

  const description = isUntouchedDefault(
    notification.description,
    notification.key,
    "description"
  )
    ? t(`EmailNotifDesc_${notification.key}`)
    : notification.description;

  return { title, description };
};
