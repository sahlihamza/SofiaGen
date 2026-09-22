import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";

const DEFAULT_CURRENCY = {
  isoCode: "USD",
  symbol: "$",
  decimalDigits: 2,
  locale: "en-US",
};

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

export function useCurrency() {
  const context = useAuthorizationContext();
  const currency = context?.currentStore?.currency || DEFAULT_CURRENCY;

  return {
    currency,
    formatMoney: (amount) => formatMoney(amount, currency),
    isoCode: currency.isoCode,
    symbol: currency.symbol,
    decimalDigits: currency.decimalDigits,
    locale: currency.locale,
  };
}
