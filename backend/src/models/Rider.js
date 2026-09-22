const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const riderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est obligatoire"],
    },
    image: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      validate: {
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Format d'email invalide",
      },
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est obligatoire"],
      minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
      select: false,
    },
    phone: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    vehicleType: {
      type: String,
      required: false,
      enum: ["Van", "Voiture", "Vélo", "Scooter"],
    },
    vehicleNumber: {
      type: String,
      required: false,
    },
    availability: {
      type: String,
      required: false,
      default: "offline",
      enum: ["delivering", "offline", "available"],
    },
    status: {
      type: String,
      required: false,
      default: "active",
      enum: ["active", "inactive"],
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
      index: true,
    },
    totalDeliveries: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    cancelledDeliveries: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: false,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

riderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  if (!this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Rider = mongoose.model("Rider", riderSchema);

module.exports = Rider;