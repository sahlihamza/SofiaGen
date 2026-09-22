const mongoose = require("mongoose");

const API_KEY_SCOPES = [
  "products.read",
  "products.write",
  "orders.read",
  "orders.write",
  "customers.read",
  "customers.write",
  "analytics.read",
];

const apiKeySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Display-only identifier; the raw secret is shown exactly once at
    // creation / rotation and only its SHA-256 hash is persisted.
    prefix: { type: String, required: true, trim: true },
    secretHash: { type: String, required: true, select: false },
    scopes: [{ type: String, enum: API_KEY_SCOPES }],
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

apiKeySchema.index({ storeId: 1, status: 1 });

const ApiKey = mongoose.model("ApiKey", apiKeySchema);

module.exports = { ApiKey, API_KEY_SCOPES };
