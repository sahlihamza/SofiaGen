const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
    device: {
      type: String,
      required: false,
    },
    browser: {
      type: String,
      required: false,
    },
    os: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
    logoutAt: {
      type: Date,
      required: false,
      default: null,
    },
    sessionDuration: {
      type: Number,
      required: false,
      default: null,
    },
    status: {
      type: String,
      enum: ["success", "failed", "blocked", "suspended", "expired"],
      default: "success",
    },
    failureReason: {
      type: String,
      required: false,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    sessionId: {
      type: String,
      required: false,
    },
    isAdminLogin: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

loginHistorySchema.index({ userId: 1, loginAt: -1 });
loginHistorySchema.index({ ipAddress: 1, loginAt: -1 });
loginHistorySchema.index({ status: 1, loginAt: -1 });

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);

module.exports = LoginHistory;
