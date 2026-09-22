require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("../config/logger");
const User = require("../models/User");
const Role = require("../models/Role");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";

const reactivateSuperAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const superAdminRole = await Role.findOne({ slug: "super-admin", scope: "platform" });

  const user = await User.findOne({
    $or: [{ email: SUPER_ADMIN_EMAIL }, { email: new RegExp(`^${SUPER_ADMIN_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.deleted\\.`) }],
  });

  if (!user) {
    logger.info(`Aucun utilisateur trouvé avec l'email ${SUPER_ADMIN_EMAIL}`);
    process.exit(0);
  }

  const wasDeleted = !!user.deletedAt;
  const wasInactive = user.status === "Inactive";
  const wasBlocked = user.status === "Blocked";
  const wasSuspended = user.status === "Suspended";

  await User.findByIdAndUpdate(user._id, {
    deletedAt: null,
    deletedBy: null,
    status: "Active",
    email: SUPER_ADMIN_EMAIL,
    isSuperAdmin: true,
    userType: "superadmin",
    role: superAdminRole ? [superAdminRole._id] : user.role,
    failedLoginAttempts: 0,
    lockedUntil: null,
    suspendedAt: null,
    suspendedUntil: null,
    suspendedReason: null,
    blockedAt: null,
    blockedReason: null,
    blockedBy: null,
    refreshToken: null,
  });

  logger.info(
    `Super Admin réactivé : ${SUPER_ADMIN_EMAIL}`
  );
  logger.info(
    `Ancien statut : deletedAt=${wasDeleted ? "défini" : "non"}, status=${user.status}`
  );

  process.exit(0);
};

reactivateSuperAdmin().catch((err) => {
  logger.error("Erreur lors de la réactivation du super admin:", err.message);
  process.exit(1);
});
