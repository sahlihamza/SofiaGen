const mongoose = require("mongoose");

const platformTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Le nom de l'équipe est obligatoire"], trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: false, trim: true },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    membersCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null },
  },
  { timestamps: true }
);

platformTeamSchema.index({ code: 1 }, { unique: true });
platformTeamSchema.index({ status: 1 });

module.exports = mongoose.model("PlatformTeam", platformTeamSchema);
