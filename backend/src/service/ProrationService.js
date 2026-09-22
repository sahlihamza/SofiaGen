const MS_PER_DAY = 24 * 60 * 60 * 1000;

const badRequest = (message, code = "PRORATION_INVALID_INPUT") => {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toDate = (value, label) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw badRequest(`${label} n'est pas une date valide`);
  return d;
};

const daysBetween = (from, to) => {
  const diff = toDate(to, "date").getTime() - toDate(from, "date").getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
};

const calculateProration = ({
  oldPrice,
  newPrice,
  periodStart,
  periodEnd,
  changeDate = new Date(),
  oldCurrency = null,
  newCurrency = null,
  conversionRate = null,
} = {}) => {
  const start = toDate(periodStart, "periodStart");
  const end = toDate(periodEnd, "periodEnd");
  const change = toDate(changeDate, "changeDate");

  if (end <= start) {
    throw badRequest("periodEnd doit être postrieur  periodStart");
  }
  if (change < start || change > end) {
    throw badRequest("changeDate doit être comprise dans la période de facturation");
  }

  const oldAmountRaw = Number(oldPrice);
  const newAmountRaw = Number(newPrice);
  if (!Number.isFinite(oldAmountRaw) || oldAmountRaw < 0) {
    throw badRequest("oldPrice doit être un nombre positif");
  }
  if (!Number.isFinite(newAmountRaw) || newAmountRaw < 0) {
    throw badRequest("newPrice doit être un nombre positif");
  }

  let oldAmount = oldAmountRaw;
  let currency = newCurrency || oldCurrency || null;

  if (oldCurrency && newCurrency && oldCurrency !== newCurrency) {
    if (!Number.isFinite(Number(conversionRate)) || Number(conversionRate) <= 0) {
      throw badRequest(
        `Changement de devise ${oldCurrency} -> ${newCurrency} sans taux de conversion fourni`,
        "PRORATION_CURRENCY_MISMATCH"
      );
    }
    oldAmount = oldAmountRaw * Number(conversionRate);
    currency = newCurrency;
  }

  const totalDays = daysBetween(start, end);
  const remainingDays = daysBetween(change, end);
  const usedDays = totalDays - remainingDays;

  const dailyOldRate = oldAmount / totalDays;
  const dailyNewRate = newAmountRaw / totalDays;

  const credit = round2(dailyOldRate * remainingDays);
  const newCharge = round2(dailyNewRate * remainingDays);
  const amountDue = round2(newCharge - credit);

  return {
    credit,
    newCharge,
    amountDue,
    usedDays,
    remainingDays,
    totalDays,
    currency,
    direction: amountDue > 0 ? "upgrade" : amountDue < 0 ? "downgrade" : "neutral",
    convertedFrom: oldCurrency && newCurrency && oldCurrency !== newCurrency
      ? { currency: oldCurrency, amount: round2(oldAmountRaw), conversionRate: Number(conversionRate) }
      : null,
  };
};

module.exports = { calculateProration, daysBetween, round2, MS_PER_DAY };
