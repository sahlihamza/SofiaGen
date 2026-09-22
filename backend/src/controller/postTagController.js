const postTagService = require("../service/postTagService");

const getPostTags = async (req, res) => {
  try {
    const { search, page, limit, sort } = req.query;
    const { tags, totalDoc, limits, pages } = await postTagService.getAllTags({
      storeId: req.currentStoreId,
      search,
      page,
      limit,
      sort,
    });

    return res.status(200).json({
      success: true,
      data: tags,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getPostTagById = async (req, res) => {
  try {
    const tag = await postTagService.getTagById(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag introuvable" });
    }
    return res.status(200).json({ success: true, data: tag });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addPostTag = async (req, res) => {
  try {
    const tag = await postTagService.addTag(req.body, req.currentStoreId);
    return res.status(201).json({ success: true, message: "Tag ajouté avec succès", data: tag });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Ce slug est déjà utilisé" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updatePostTag = async (req, res) => {
  try {
    const tag = await postTagService.updateTag(req.params.id, req.body);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag introuvable" });
    }
    return res.status(200).json({ success: true, message: "Tag mis à jour avec succès", data: tag });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deletePostTag = async (req, res) => {
  try {
    const tag = await postTagService.deleteTag(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, message: "Tag introuvable" });
    }
    return res.status(200).json({ success: true, message: "Tag supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteManyPostTags = async (req, res) => {
  try {
    const { ids } = req.body;
    await postTagService.deleteManyTags(ids);
    return res.status(200).json({ success: true, message: "Tags supprimés avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getPostTags,
  getPostTagById,
  addPostTag,
  updatePostTag,
  deletePostTag,
  deleteManyPostTags,
};
