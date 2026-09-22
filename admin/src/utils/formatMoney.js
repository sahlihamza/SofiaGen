function formatMoney(amount, currency) {
  if (!currency) return `$${Number(amount || 0).toFixed(2)}`;

  if (typeof currency === "object") {
    const isoCode = currency.isoCode || "USD";
    const locale = currency.locale || "en-US";
    const decimalDigits = currency.decimalDigits ?? 2;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: isoCode,
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(Number(amount) || 0);
  }

  const code = String(currency).toUpperCase().trim();
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(Number(amount) || 0);
}

export default formatMoney;
