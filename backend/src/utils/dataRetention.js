const ANONYMIZED_EMAIL_DOMAIN = "anonymized.invalid";

// Converts a {value, unit} retention period into a cutoff Date: records
// older than this date have exceeded their retention window. A null/empty/
// zero value means "keep indefinitely" (matches the settings UI, where an
// empty field means unlimited retention), so this returns null in that case
//  callers should treat null as "don't touch this category".
//
// Calendar-accurate arithmetic (setDate/setMonth/setFullYear) is used rather
// than converting to a fixed number of days, so "1 month" means "one
// calendar month ago" and not a 30-day approximation.
const getRetentionCutoffDate = (period, now = new Date()) => {
  if (!period) return null;

  const amount = Number(period.value);
  if (period.value === null || period.value === undefined || period.value === "") {
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cutoff = new Date(now);
  switch (period.unit) {
    case "weeks":
      cutoff.setDate(cutoff.getDate() - amount * 7);
      break;
    case "months":
      cutoff.setMonth(cutoff.getMonth() - amount);
      break;
    case "years":
      cutoff.setFullYear(cutoff.getFullYear() - amount);
      break;
    case "days":
    default:
      cutoff.setDate(cutoff.getDate() - amount);
      break;
  }
  return cutoff;
};


const anonymizeCustomerDoc = (customer) => {
  customer.firstName = "Anonymized";
  customer.lastName = "";
  customer.email = `anonymized-${customer._id}@${ANONYMIZED_EMAIL_DOMAIN}`;
  customer.phone = "";
  customer.avatar = "";
  customer.address = "";
  customer.country = "";
  customer.city = "";
  customer.shippingAddress = null;
  customer.anonymizedAt = new Date();
  return customer;
};


const anonymizeOrderDoc = (order) => {
  order.user_info = {
    name: "Anonymized",
    email: `anonymized-${order._id}@${ANONYMIZED_EMAIL_DOMAIN}`,
    contact: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
  };
  order.cardInfo = undefined;
  order.anonymizedAt = new Date();
  return order;
};

module.exports = {
  getRetentionCutoffDate,
  anonymizeCustomerDoc,
  anonymizeOrderDoc,
};
