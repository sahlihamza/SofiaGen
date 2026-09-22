require("dotenv").config();
const mongoose = require("mongoose");
const PlatformTeam = require("../models/PlatformTeam");
const PlatformTeamMember = require("../models/PlatformTeamMember");
const User = require("../models/User");
const Invitation = require("../models/Invitation");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const teams = await PlatformTeam.find({});
  const members = await PlatformTeamMember.find({}).populate("userId", "name email");
  const users = await User.find({ email: { $in: ["ahmed.benali@sofia.gen", "yassine.amrani@sofia.gen", "ali.tazi@sofia.gen", "sara.idrissi@sofia.gen", "mohamed.fassi@sofia.gen", "amine.bennis@sofia.gen"] } }).select("name email userType status");
  const invs = await Invitation.find({ email: { $in: ["new.support@sofia.gen", "ops.manager@sofia.gen"] } }).select("email status");
  console.log("Teams:", teams.map((t) => t.name).join(", "));
  console.log("Users:", users.map((u) => u.name).join(", "));
  console.log("Members:", members.map((m) => m.userId?.name + " -> " + m.teamId).join(", "));
  console.log("Invitations:", invs.map((i) => i.email + " (" + i.status + ")").join(", "));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
