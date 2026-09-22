require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Role = require("../models/Role");
const User = require("../models/User");
const Permission = require("../models/Permission");
const PlatformTeam = require("../models/PlatformTeam");
const PlatformTeamMember = require("../models/PlatformTeamMember");
const Invitation = require("../models/Invitation");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const modules = [
    { name: "Platform User", actions: ["view", "create", "update", "delete", "suspend", "activate", "sessions"] },
    { name: "Platform Role", actions: ["view", "create", "update", "delete"] },
    { name: "Platform Coupons", actions: ["view", "create", "update", "delete"] },
    { name: "Platform Store", actions: ["view", "create", "update", "delete", "suspend", "activate"] },
    { name: "Platform Settings", actions: ["view", "update"] },
    { name: "Platform Invitation", actions: ["view", "create", "resend", "revoke"] },
    { name: "Platform Team", actions: ["view", "create", "update", "delete", "members_manage"] },
    { name: "Platform Staff", actions: ["view", "create", "update", "suspend", "activate", "role_assign", "team_manage"] },
    { name: "Audit", actions: ["view", "export"] },
  ];

  for (const mod of modules) {
    for (const action of mod.actions) {
      const code = `${mod.name.toLowerCase().replace(/\s+/g, ".")}.${action}`;
      await Permission.findOneAndUpdate(
        { module: mod.name, action },
        { code, name: code, module: mod.name, action, scope: "platform", category: "Platform Management" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  const permissions = await Permission.find({});
  const platformRoles = await Role.find({ scope: "platform" });
  const storeRoles = await Role.find({ scope: "store" });

  const platformAdminRole = platformRoles.find((r) => r.slug === "platform-admin") || platformRoles[0];
  const supportRole = platformRoles.find((r) => r.slug === "platform-support") || platformAdminRole;
  const managerRole = storeRoles.find((r) => r.slug === "manager") || storeRoles[0];

  const superAdminRole = platformRoles.find((r) => r.slug === "super-admin");
  if (superAdminRole) {
    superAdminRole.permissions = permissions.map((p) => p._id);
    await superAdminRole.save();
  }

  platformAdminRole.permissions = permissions
    .filter((p) => p.module === "Platform User" && ["view", "create", "update"].includes(p.action))
    .concat(permissions.filter((p) => ["Platform Role", "Platform Invitation", "Platform Team", "Platform Staff", "Audit"].includes(p.module)))
    .map((p) => p._id);
  await platformAdminRole.save();

  const superAdmin = await User.findOne({ email: "superadmin@gmail.com", deletedAt: null });
  const actorId = superAdmin ? superAdmin._id : null;

  const teams = [
    { name: "Platform Support", code: "PLATFORM-SUPPORT", description: "Equipe support plateforme", status: "active" },
    { name: "Platform Operations", code: "PLATFORM-OPS", description: "Equipe operations plateforme", status: "active" },
    { name: "Finance", code: "FINANCE", description: "Equipe finance", status: "active" },
    { name: "Technical Support", code: "TECH-SUPPORT", description: "Equipe support technique", status: "active" },
    { name: "Security", code: "SECURITY", description: "Equipe securite", status: "active" },
  ];

  const createdTeams = [];
  for (const teamData of teams) {
    const team = await PlatformTeam.findOneAndUpdate(
      { code: teamData.code },
      { name: teamData.name, code: teamData.code, description: teamData.description, status: teamData.status, createdBy: actorId, updatedBy: actorId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    createdTeams.push(team);
    console.log(`Team seeded: ${team.name} (${team.code})`);
  }

  const staffUsers = [
    { name: "Ahmed Benali", email: "ahmed.benali@sofia.gen", userType: "platform_admin", role: [platformAdminRole._id], status: "Active" },
    { name: "Yassine Amrani", email: "yassine.amrani@sofia.gen", userType: "platform_admin", role: [platformAdminRole._id], status: "Active" },
    { name: "Ali Tazi", email: "ali.tazi@sofia.gen", userType: "staff", role: [supportRole._id], status: "Active" },
    { name: "Sara Idrissi", email: "sara.idrissi@sofia.gen", userType: "staff", role: [managerRole._id], status: "Active" },
    { name: "Mohamed Fassi", email: "mohamed.fassi@sofia.gen", userType: "staff", role: [supportRole._id], status: "Active" },
    { name: "Amine Bennis", email: "amine.bennis@sofia.gen", userType: "staff", role: [managerRole._id], status: "Active" },
  ];

  const createdUsers = [];
  for (const userData of staffUsers) {
    const existing = await User.findOne({ email: userData.email, deletedAt: null });
    if (existing) {
      existing.role = userData.role;
      existing.userType = userData.userType;
      existing.status = userData.status;
      await existing.save();
      createdUsers.push(existing);
    } else {
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      const user = await User.create({ ...userData, password: hashedPassword, emailVerified: true, provider: "local" });
      createdUsers.push(user);
    }
    console.log(`User seeded: ${userData.name} (${userData.email})`);
  }

  const memberships = [
    { teamIndex: 0, userIndex: 2 },
    { teamIndex: 0, userIndex: 4 },
    { teamIndex: 1, userIndex: 3 },
    { teamIndex: 1, userIndex: 5 },
    { teamIndex: 2, userIndex: 3 },
    { teamIndex: 3, userIndex: 2 },
    { teamIndex: 3, userIndex: 4 },
    { teamIndex: 4, userIndex: 5 },
  ];

  for (const m of memberships) {
    const team = createdTeams[m.teamIndex];
    const user = createdUsers[m.userIndex];
    if (!team || !user) continue;
    const existing = await PlatformTeamMember.findOne({ teamId: team._id, userId: user._id });
    if (!existing) {
      await PlatformTeamMember.create({ teamId: team._id, userId: user._id, status: "active", addedBy: actorId });
      await PlatformTeam.updateOne({ _id: team._id }, { $inc: { membersCount: 1 } });
      console.log(`Member added: ${user.name} -> ${team.name}`);
    }
  }

  const invitations = [
    { email: "new.support@sofia.gen", firstName: "New", lastName: "Support", roleIds: [platformAdminRole._id], storeId: null, invitedBy: actorId, sendEmail: false },
    { email: "ops.manager@sofia.gen", firstName: "Ops", lastName: "Manager", roleIds: [platformAdminRole._id], storeId: null, invitedBy: actorId, sendEmail: false },
  ];

  for (const inv of invitations) {
    const existing = await Invitation.findOne({ email: inv.email, status: "pending" });
    if (!existing) {
      try {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        await Invitation.create({
          email: inv.email.toLowerCase(),
          firstName: inv.firstName,
          lastName: inv.lastName,
          tokenHash,
          tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "pending",
          invitedBy: inv.invitedBy,
          roleIds: inv.roleIds,
          storeId: inv.storeId,
        });
        console.log(`Invitation seeded: ${inv.email}`);
      } catch (e) {
        console.log(`Invitation skipped for ${inv.email}: ${e.message}`);
      }
    }
  }

  console.log("Seed completed:", createdTeams.length, "teams,", createdUsers.length, "users");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
