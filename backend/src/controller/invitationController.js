const InvitationService = require("../service/InvitationService");

const acceptInvitation = async (req, res) => {
  try {
    const result = await InvitationService.acceptInvitation(req.body.token, req.body.password);
    return res.status(200).json({ success: true, data: result.user });
  } catch (error) {
    if (["InvalidInvitation", "InvalidInvitationState", "InvalidScope", "InvalidPassword"].includes(error.name)) {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getAllInvitations = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      storeId: req.query.storeId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      platformOnly: req.query.platformOnly === "true",
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };

    const result = await InvitationService.getAllInvitations(filters, pagination);

    return res.status(200).json({
      success: true,
      message: "Invitations récupérés avec succès",
      data: result.invitations,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getInvitation = async (req, res) => {
  try {
    const invitation = await InvitationService.getInvitationById(req.params.id, true);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation introuvable",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation récupéré avec succès",
      data: invitation,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const createInvitation = async (req, res) => {
  try {
    const result = await InvitationService.createInvitation({
      ...req.body,
      invitedBy: req.user._id,
      platformOnly: true,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.status(201).json({
      success: true,
      message: "Invitation créé avec succès",
      data: result.invitation,
      invitationToken: result.invitationToken,
      invitationUrl: result.invitationUrl,
    });
  } catch (error) {
    if (error.name === "EmailExists") {
      return res.status(409).json({ success: false, message: "Cet email est déjà utilisé par un utilisateur actif" });
    }
    if (error.name === "InvitationExists") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidRoles") {
      return res.status(422).json({ success: false, message: error.message });
    }
    if (error.name === "InvalidScope") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const resendInvitation = async (req, res) => {
  try {
    const result = await InvitationService.resendInvitation(req.params.id, req.ip, req.headers["user-agent"], req.user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation renvoyé avec succès",
      data: result.invitation,
      invitationToken: result.invitationToken,
      invitationUrl: result.invitationUrl,
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Invitation introuvable" });
    }
    if (error.name === "InvalidState") {
      return res.status(422).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const cancelInvitation = async (req, res) => {
  try {
    await InvitationService.cancelInvitation(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation annulée avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Invitation introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const revokeInvitation = async (req, res) => {
  try {
    await InvitationService.revokeInvitation(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation révoqué avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Invitation introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteInvitation = async (req, res) => {
  try {
    await InvitationService.deleteInvitation(req.params.id, req.user._id);

    return res.status(200).json({
      success: true,
      message: "Invitation supprimée avec succès",
    });
  } catch (error) {
    if (error.name === "NotFound") {
      return res.status(404).json({ success: false, message: "Invitation introuvable" });
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  acceptInvitation,
  getAllInvitations,
  getInvitation,
  createInvitation,
  resendInvitation,
  cancelInvitation,
  deleteInvitation,
  revokeInvitation,
};
