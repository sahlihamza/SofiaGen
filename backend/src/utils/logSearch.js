const mongoose = require("mongoose");

// LOG-6: one search box is meant to match across several kinds of fields at
// once (free text like message/errorCode, and ids like userId/storeId/
// entityId). Regex only works on strings, so ObjectId fields are matched by
// exact equality when the search term looks like a valid ObjectId, and by
// regex on everything else. Shared so System/Security/Webhook/Audit logs all
// support the same search behaviour instead of each reinventing it.
const buildUnifiedSearchQuery = (search, { stringFields = [], objectIdFields = [] } = {}) => {
  if (!search) return null;

  const clauses = stringFields.map((field) => ({ [field]: { $regex: search, $options: "i" } }));

  if (mongoose.isValidObjectId(search)) {
    for (const field of objectIdFields) {
      clauses.push({ [field]: search });
    }
  }

  return clauses.length ? { $or: clauses } : null;
};

module.exports = { buildUnifiedSearchQuery };
