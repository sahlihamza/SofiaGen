const StaffManagementService = require("../service/StaffManagementService");

const getStaffList = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      userType: req.query.userType,
      isSuperAdmin: req.query.isSuperAdmin,
      roleIds: req.query.roleIds || req.query.roleId,
      department: req.query.department,
      country: req.query.country,
      twoFactorEnabled: req.query.twoFactorEnabled,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      storeId: req.query.storeId,
    };

    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const sort = req.query.sort || "-createdAt";

    const result = await StaffManagementService.getStaffList(filters, pagination, sort);

    return res.status(200).json({
      success: true,
      message: "Personnel récupéré avec succès",
      data: result.users,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getStaffMember = async (req, res) => {
  try {
    const user = await StaffManagementService.getStaffMember(req.params.userId);
    return res.status(200).json({
      success: true,
      message: "Membre du personnel récupéré avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const assignRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json({ success: false, message: "roleId est requis" });
    }
    const user = await StaffManagementService.assignRole(req.params.userId, roleId, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Rôle assigné au membre du personnel avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel ou rôle introuvable" });
    }
    if (error.name === "InvalidRoleScope") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const removeRole = async (req, res) => {
  try {
    const user = await StaffManagementService.removeRole(req.params.userId, req.params.roleId);
    return res.status(200).json({
      success: true,
      message: "Rôle retiré du membre du personnel avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addToTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ success: false, message: "teamId est requis" });
    }
    const user = await StaffManagementService.addToTeam(req.params.userId, teamId, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Membre du personnel ajouté  l'équipe avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel ou équipe introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const removeFromTeam = async (req, res) => {
  try {
    const user = await StaffManagementService.removeFromTeam(req.params.userId, req.params.teamId, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Membre du personnel retiré de l'équipe avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const suspendStaff = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await StaffManagementService.suspendStaff(req.params.userId, reason, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Membre du personnel suspendu avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const activateStaff = async (req, res) => {
  try {
    const user = await StaffManagementService.activateStaff(req.params.userId, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Membre du personnel réactivé avec succès",
      data: user,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const revokeSessions = async (req, res) => {
  try {
    const result = await StaffManagementService.revokeSessions(req.params.userId, req.user._id);
    return res.status(200).json({
      success: true,
      message: "Sessions révoqués avec succès",
      data: result,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getEffectivePermissions = async (req, res) => {
  try {
    const permissions = await StaffManagementService.getEffectivePermissions(req.params.userId);
    return res.status(200).json({
      success: true,
      message: "Permissions effectives récupérés avec succès",
      data: permissions,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre du personnel introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getStaffList,
  getStaffMember,
  assignRole,
  removeRole,
  addToTeam,
  removeFromTeam,
  suspendStaff,
  activateStaff,
  revokeSessions,
  getEffectivePermissions,
};
