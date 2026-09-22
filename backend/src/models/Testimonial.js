const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    company: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Email invalide"],
    },
    avatar: { type: String, trim: true },
    image: { type: String, trim: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    title: { type: String, trim: true },
    text: { type: String, required: true },
    date: { type: Date },
    isApproved: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    category: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    link: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    companyLogo: { type: String, trim: true },
    source: { type: String, trim: true },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    locale: {
      type: String,
      default: "fr",
      enum: ["fr", "en", "ar", "es"],
    },
  },
  { timestamps: true }
);

testimonialSchema.index({ storeId: 1, isApproved: 1, isFeatured: 1, rating: 1, createdAt: -1 });

const Testimonial = mongoose.model("Testimonial", testimonialSchema);
module.exports = Testimonial;
