const mongoose = require("mongoose");

const storeDomainSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    domain: { type: String, required: true, unique: true },
    type: { type: String, enum: ["custom", "platform"], default: "custom" },
    isPrimary: { type: Boolean, default: false },
    // Derived by DomainVerificationService only  never client-settable.
    ssl: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    dnsStatus: { type: String, enum: ["pending", "verified", "failed"], default: "pending" },
    dnsTarget: { type: String, required: false, trim: true },
    resolvedIps: { type: [String], default: [] },
    lastCheckedAt: { type: Date, default: null },
    lastError: { type: String, required: false, trim: true },
    sslStatus: { type: String, enum: ["pending", "active", "failed"], default: "pending" },
    sslExpiresAt: { type: Date, default: null },
    sslIssuer: { type: String, required: false, trim: true },
    sslLastCheckedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreDomain", storeDomainSchema);
