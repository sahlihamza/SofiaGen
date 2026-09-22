const express = require("express");
const { getCode, getCodes } = require("../config/rbac/permissionCodes");
const router = express.Router();
const PlatformTeamService = require("../service/PlatformTeamService");
const {
  isAuth,
  loadUser,
  resolveAuthorizationContext,
  requirePermission,
} = require("../middleware/auth");

router.use(isAuth, loadUser, resolveAuthorizationContext);

const getAllTeams = async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      status: req.query.status,
      code: req.query.code,
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await PlatformTeamService.getAllTeams(filters, pagination);

    return res.status(200).json({
      success: true,
      message: "équipes récupérés avec succès",
      data: result.teams,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getTeam = async (req, res) => {
  try {
    const team = await PlatformTeamService.getTeamById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "équipe récupéré avec succès",
      data: team,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "équipe introuvable" });
    }
    if (error.name === "InvalidId") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const createTeam = async (req, res) => {
  try {
    const team = await PlatformTeamService.createTeam(req.body, req.user._id);

    return res.status(201).json({
      success: true,
      message: "équipe créé avec succès",
      data: team,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Une équipe avec ce code existe déjà" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updateTeam = async (req, res) => {
  try {
    const team = await PlatformTeamService.updateTeam(req.params.id, req.body, req.user._id);

    return res.status(200).json({
      success: true,
      message: "équipe mise  jour avec succès",
      data: team,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "équipe introuvable" });
    }
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Une équipe avec ce code existe déjà" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const archiveTeam = async (req, res) => {
  try {
    await PlatformTeamService.archiveTeam(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "équipe archivé avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "équipe introuvable" });
    }
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteTeam = async (req, res) => {
  try {
    await PlatformTeamService.deleteTeam(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "équipe supprimée avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "équipe introuvable" });
    }
    if (error.name === "TeamInUse") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: "userId est requis" });
    }

    await PlatformTeamService.addMember(req.params.id, userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Membre ajouté  l'équipe avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "équipe introuvable" });
    }
    if (error.name === "AlreadyMember") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    await PlatformTeamService.removeMember(req.params.id, req.params.userId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Membre retiré de l'équipe avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Membre introuvable dans cette équipe" });
    }
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const members = await PlatformTeamService.getTeamMembers(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Membres récupérés avec succès",
      data: members,
    });
  } catch (error) {
    if (error.name === "InvalidId" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

router.get("/", requirePermission(getCode("Platform Team", "view")), getAllTeams);
router.post("/", requirePermission(getCode("Platform Team", "create")), createTeam);
router.get("/:id", requirePermission(getCode("Platform Team", "view")), getTeam);
router.put("/:id", requirePermission(getCode("Platform Team", "update")), updateTeam);
router.post("/:id/archive", requirePermission(getCode("Platform Team", "update")), archiveTeam);
router.delete("/:id", requirePermission(getCode("Platform Team", "delete")), deleteTeam);
router.post("/:id/members", requirePermission(getCode("Platform Team", "members_manage")), addMember);
router.delete("/:id/members/:userId", requirePermission(getCode("Platform Team", "members_manage")), removeMember);
router.get("/:id/members", requirePermission(getCode("Platform Team", "view")), getTeamMembers);

module.exports = router;
