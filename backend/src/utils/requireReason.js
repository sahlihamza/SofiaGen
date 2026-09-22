const MIN_REASON_LENGTH = 10;

const buildReasonError = (action) => {
  const err = new Error(
    `Un motif d'au moins ${MIN_REASON_LENGTH} caractères est obligatoire pour l'action "${action}"`
  );
  err.code = "BAD_REQUEST";
  return err;
};

const requireReason = (reason, action) => {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (value.length < MIN_REASON_LENGTH) throw buildReasonError(action);
  return value;
};

const optionalReason = (reason) => {
  const value = typeof reason === "string" ? reason.trim() : "";
  return value.length > 0 ? value : null;
};

module.exports = { requireReason, optionalReason, MIN_REASON_LENGTH };
