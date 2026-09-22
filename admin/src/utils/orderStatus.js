// The API stores the values of the Order model enum in English, while the
// back-office speaks the WooCommerce vocabulary  En attente de paiement /
// Paiement accepté / En préparation / Expédié / Terminé / Annulée /
// Remboursé. Every place that turns a stored status into something a human
// reads or into a colour goes through here, so the tabs, the badges, the row
// menus and the order page can never drift apart.

// In the order an order walks through them, which is the order the tabs and the
// status dropdown show. Must stay in step with the enum in models/Order.js.
export const ORDER_STATUSES = [
  "Pending",
  "Payment-Accepted",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancel",
  "Refunded",
];

const FALLBACK_STATUS_META = {
  labelKey: "",
  badge:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600",
  dot: "bg-gray-400",
};

const ORDER_STATUS_META = {
  Pending: {
    labelKey: "OrderStatusPending",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    dot: "bg-amber-500",
  },
  "Payment-Accepted": {
    labelKey: "OrderStatusPaymentAccepted",
    badge:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
    dot: "bg-cyan-500",
  },
  Processing: {
    labelKey: "OrderStatusProcessing",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  Shipped: {
    labelKey: "OrderStatusShipped",
    badge:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
    dot: "bg-violet-500",
  },
  Delivered: {
    labelKey: "OrderStatusDelivered",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    dot: "bg-blue-500",
  },
  Cancel: {
    labelKey: "OrderStatusCancelled",
    badge:
      "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
    dot: "bg-rose-400",
  },
  Refunded: {
    labelKey: "OrderStatusRefunded",
    badge:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
    dot: "bg-slate-400",
  },
  // Written by the point-of-sale flow, so it shows up in the same lists.
  "POS-Completed": {
    labelKey: "OrderStatusPosCompleted",
    badge:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30",
    dot: "bg-teal-500",
  },
};

export const getOrderStatusMeta = (status) =>
  ORDER_STATUS_META[status] || FALLBACK_STATUS_META;

// `t` is passed in rather than imported so this stays a plain module the
// components, the CSV export and the print views can all share.
export const getOrderStatusLabel = (status, t) => {
  const { labelKey } = getOrderStatusMeta(status);
  if (!labelKey) return status || "";
  return t(labelKey, { defaultValue: status });
};

const FALLBACK_PAYMENT_STATUS_META = {
  labelKey: "",
  className: "text-[#646970] dark:text-gray-400",
};

// Order.paymentStatus, lowercased by the schema.
const PAYMENT_STATUS_META = {
  paid: {
    labelKey: "PaymentStatusPaid",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    labelKey: "PaymentStatusPending",
    className: "text-amber-600 dark:text-amber-400",
  },
  failed: {
    labelKey: "PaymentStatusFailed",
    className: "text-rose-600 dark:text-rose-400",
  },
  refunded: {
    labelKey: "PaymentStatusRefunded",
    className: "text-blue-600 dark:text-blue-400",
  },
  cancelled: {
    labelKey: "PaymentStatusCancelled",
    className: "text-gray-500 dark:text-gray-400",
  },
};

export const getPaymentStatusMeta = (paymentStatus) =>
  PAYMENT_STATUS_META[String(paymentStatus || "").toLowerCase()] ||
  FALLBACK_PAYMENT_STATUS_META;

export const getPaymentStatusLabel = (paymentStatus, t) => {
  const { labelKey } = getPaymentStatusMeta(paymentStatus);
  if (!labelKey) return paymentStatus || "";
  return t(labelKey, { defaultValue: paymentStatus });
};

// Gateway keys the checkout can store on an order. The backend matches
// `paymentMethod` with a regex, so the key is what gets sent  both by the
// order list filter and by the order screen when the method is corrected.
export const PAYMENT_METHOD_KEYS = [
  "cod",
  "bank_transfer",
  "cheque",
  "stripe",
  "woopayments",
  "paypal",
  "konnect",
  "flouci",
];

// Checkout stores the gateway key ("cod", "stripe", "konnect"...), which the
// payment settings screens already translate under `PaymentMethodTitle_<key>`.
// Older orders hold a free-text label ("Cash", "Card"), so anything without a
// translation is shown as it was stored.
export const getPaymentMethodLabel = (paymentMethod, t) => {
  if (!paymentMethod) return "";

  const key = String(paymentMethod);
  const translated = t(`PaymentMethodTitle_${key}`, { defaultValue: "" });
  if (translated) return translated;

  return t(key, { defaultValue: key });
};
