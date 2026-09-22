const postCategoryService = require("../service/postCategoryService");

const getPostCategories = async (req, res) => {
  try {
    const { search, page, limit, tree } = req.query;

    if (tree === "true") {
      const categories = await postCategoryService.getCategoryTree(req.currentStoreId);
      return res.status(200).json({ success: true, data: categories });
    }

    const { categories, totalDoc, limits, pages } = await postCategoryService.getAllCategories({
      storeId: req.currentStoreId,
      search,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: categories,
      totalDoc,
      limits,
      pages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

const getPostCategoryById = async (req, res) => {
  try {
    const category = await postCategoryService.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie introuvable" });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const addPostCategory = async (req, res) => {
  try {
    const category = await postCategoryService.addCategory(req.body, req.currentStoreId);
    return res.status(201).json({
      success: true,
      message: "Catégorie ajouté avec succès",
      data: category,
    });
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

const updatePostCategory = async (req, res) => {
  try {
    const category = await postCategoryService.updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie introuvable" });
    }
    return res.status(200).json({
      success: true,
      message: "Catégorie mise  jour avec succès",
      data: category,
    });
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

const deletePostCategory = async (req, res) => {
  try {
    const category = await postCategoryService.deleteCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie introuvable" });
    }
    return res.status(200).json({ success: true, message: "Catégorie supprimée avec succès" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Identifiant invalide" });
    }
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

const deleteManyPostCategories = async (req, res) => {
  try {
    const { ids } = req.body;
    await postCategoryService.deleteManyCategories(ids);
    return res.status(200).json({ success: true, message: "Catégories supprimées avec succès" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getPostCategories,
  getPostCategoryById,
  addPostCategory,
  updatePostCategory,
  deletePostCategory,
  deleteManyPostCategories,
};
