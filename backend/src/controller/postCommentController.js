const postCommentService = require("../service/postCommentService");
const { resolveStoreId } = require("../utils/requestContext");

const getPostComments = async (req, res) => {
  try {
    const { postId, status, search, page, limit } = req.query;
    const { comments, totalDoc, limits, pages } = await postCommentService.getAllComments({
      storeId: resolveStoreId(req),
      postId,
      status,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: comments,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getPostCommentById = async (req, res) => {
  try {
    const comment = await postCommentService.getCommentById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Commentaire introuvable" });
    }
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addPostComment = async (req, res) => {
  try {
    const comment = await postCommentService.addComment(resolveStoreId(req), req.body);
    return res.status(201).json({ success: true, message: "Commentaire ajouté avec succès", data: comment });
  } catch (error) {
    if (error.code === "POST_NOT_FOUND") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.code === "COMMENTS_DISABLED") {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updatePostComment = async (req, res) => {
  try {
    const comment = await postCommentService.updateComment(req.params.id, req.body);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Commentaire introuvable" });
    }
    return res.status(200).json({ success: true, message: "Commentaire mis à jour avec succès", data: comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const moderatePostComment = async (req, res) => {
  try {
    const { status } = req.body;
    const comment = await postCommentService.updateCommentStatus(req.params.id, status);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Commentaire introuvable" });
    }
    return res.status(200).json({ success: true, message: "Statut mis à jour avec succès", data: comment });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deletePostComment = async (req, res) => {
  try {
    const comment = await postCommentService.deleteComment(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Commentaire introuvable" });
    }
    return res.status(200).json({ success: true, message: "Commentaire supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getPostComments,
  getPostCommentById,
  addPostComment,
  updatePostComment,
  moderatePostComment,
  deletePostComment,
};

