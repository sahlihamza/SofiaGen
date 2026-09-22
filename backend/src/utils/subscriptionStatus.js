const STATUS = {
  PENDING: "pending",
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  GRACE_PERIOD: "grace_period",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

const CANONICAL_STATUSES = Object.values(STATUS);

const LEGACY_ALIASES = {
  trial: STATUS.TRIALING,
  canceled: STATUS.CANCELLED,
};

const ALL_ACCEPTED_STATUSES = [...CANONICAL_STATUSES, ...Object.keys(LEGACY_ALIASES)];

const ENTITLED_STATUSES = [
  STATUS.TRIALING,
  STATUS.ACTIVE,
  STATUS.PAST_DUE,
  STATUS.GRACE_PERIOD,
];

const OCCUPYING_STATUSES = [
  STATUS.PENDING,
  STATUS.TRIALING,
  STATUS.ACTIVE,
  STATUS.PAST_DUE,
  STATUS.GRACE_PERIOD,
];

const TERMINAL_STATUSES = [STATUS.CANCELLED, STATUS.EXPIRED];

const normalizeStatus = (status) => {
  if (status === null || status === undefined) return null;
  const raw = String(status).trim().toLowerCase();
  return LEGACY_ALIASES[raw] || raw;
};

const isCanonical = (status) => CANONICAL_STATUSES.includes(normalizeStatus(status));

const expandForQuery = (statuses) => {
  const list = Array.isArray(statuses) ? statuses : [statuses];
  const out = new Set();
  for (const s of list) {
    const canonical = normalizeStatus(s);
    if (!canonical) continue;
    out.add(canonical);
    for (const [legacy, target] of Object.entries(LEGACY_ALIASES)) {
      if (target === canonical) out.add(legacy);
    }
  }
  return [...out];
};

module.exports = {
  STATUS,
  CANONICAL_STATUSES,
  LEGACY_ALIASES,
  ALL_ACCEPTED_STATUSES,
  ENTITLED_STATUSES,
  OCCUPYING_STATUSES,
  TERMINAL_STATUSES,
  normalizeStatus,
  isCanonical,
  expandForQuery,
};
