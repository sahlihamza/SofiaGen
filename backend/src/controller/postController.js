const postService = require("../service/postService");

const getPosts = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      tag,
      author,
      featured,
      sticky,
      dateFrom,
      dateTo,
      page,
      limit,
      sort,
    } = req.query;

    const { posts, totalDoc, limits, pages } = await postService.getAllPosts({
      storeId: req.currentStoreId,
      search,
      status,
      category,
      tag,
      author,
      featured,
      sticky,
      dateFrom,
      dateTo,
      page,
      limit,
      sort,
    });

    return res.status(200).json({
      success: true,
      data: posts,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, data: post });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addPost = async (req, res) => {
  try {
    const post = await postService.addPost(req.body, req.user._id, req.currentStoreId);
    return res.status(201).json({ success: true, message: "Article ajouté avec succès", data: post });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, message: "Article mis à jour avec succès", data: post });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({ field: err.path, message: err.message }));
      return res.status(422).json({ success: false, message: "Donnés invalides", errors });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await postService.deletePost(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, message: "Article supprimé avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteManyPosts = async (req, res) => {
  try {
    await postService.deleteManyPosts(req.body.ids);
    return res.status(200).json({ success: true, message: "Articles supprimés avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const publishPost = async (req, res) => {
  try {
    const post = await postService.setStatus(req.params.id, "published");
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, message: "Article publié avec succès", data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const unpublishPost = async (req, res) => {
  try {
    const post = await postService.setStatus(req.params.id, "draft");
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, message: "Article dépublié avec succès", data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const archivePost = async (req, res) => {
  try {
    const post = await postService.setStatus(req.params.id, "archived");
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(200).json({ success: true, message: "Article archivé avec succès", data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const duplicatePost = async (req, res) => {
  try {
    const post = await postService.duplicatePost(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Article introuvable" });
    }
    return res.status(201).json({ success: true, message: "Article dupliqué avec succès", data: post });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    await postService.setStatusMany(ids, status);
    return res.status(200).json({ success: true, message: "Statut mis à jour avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const bulkChangeCategory = async (req, res) => {
  try {
    const { ids, categoryId } = req.body;
    await postService.bulkChangeCategory(ids, categoryId);
    return res.status(200).json({ success: true, message: "Catégorie mise  jour avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const bulkAddTag = async (req, res) => {
  try {
    const { ids, tagId } = req.body;
    await postService.bulkAddTag(ids, tagId);
    return res.status(200).json({ success: true, message: "Tag ajouté avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getPosts,
  getPostById,
  addPost,
  updatePost,
  deletePost,
  deleteManyPosts,
  publishPost,
  unpublishPost,
  archivePost,
  duplicatePost,
  bulkUpdateStatus,
  bulkChangeCategory,
  bulkAddTag,
};
