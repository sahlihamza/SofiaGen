function formatMoney(amount, currency) {
  const isoCode = currency?.isoCode || "USD";
  const locale = currency?.locale || "en-US";
  const decimalDigits = currency?.decimalDigits ?? 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: isoCode,
    minimumFractionDigits: decimalDigits,
    maximumFractionDigits: decimalDigits,
  }).format(Number(amount) || 0);
}

module.exports = { formatMoney };
