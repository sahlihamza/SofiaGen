const mongoose = require("mongoose");

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: false,
      trim: true,
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled", "revoked"],
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    acceptedAt: {
      type: Date,
      required: false,
      default: null,
    },
    roleIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Role",
      default: [],
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
    },
    sendCount: {
      type: Number,
      default: 0,
    },
    lastSentAt: {
      type: Date,
      required: false,
      default: null,
    },
    ip: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

invitationSchema.index({ email: 1 });
invitationSchema.index({ status: 1 });
invitationSchema.index({ createdAt: -1 });
invitationSchema.index({ tokenExpiresAt: 1 });

invitationSchema.pre("save", function (next) {
  if (!this.expiresAt && this.tokenExpiresAt) {
    this.expiresAt = this.tokenExpiresAt;
  }
  next();
});

const Invitation = mongoose.model("Invitation", invitationSchema);

module.exports = Invitation;
