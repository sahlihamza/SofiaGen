const ProductCategoryService = require("../service/ProductCategoryService");

const { resolveStoreId } = require("../utils/requestContext");

const addCategory = async (req, res) => {
  try {
    const newCategory = await ProductCategoryService.createCategory({ ...req.body, storeId: resolveStoreId(req) });
    res.send(newCategory);
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
};

const addAllCategories = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const categories = Array.isArray(req.body) ? req.body.map((c) => ({ ...c, storeId })) : [];
    await ProductCategoryService.createManyCategories(categories);
    res.status(200).send({
      message: "Categories Added successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingCategories = async (req, res) => {
  try {
    const categories = await ProductCategoryService.getShowingCategories(resolveStoreId(req));
    res.send(categories);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getMostUsedCategories = async (req, res) => {
  try {
    const categories = await ProductCategoryService.getMostUsedCategories({
      ...req.query,
      storeId: resolveStoreId(req),
    });
    res.send(categories);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const result = await ProductCategoryService.getAllCategories({
      ...req.query,
      storeId: resolveStoreId(req),
    });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await ProductCategoryService.getCategoryById(
      req.params.id,
      resolveStoreId(req)
    );
    res.send(category);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const products = await ProductCategoryService.getProductsByCategory(
      req.params.id,
      resolveStoreId(req)
    );
    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await ProductCategoryService.updateCategory(
      req.params.id,
      req.body,
      resolveStoreId(req)
    );

    if (category) {
      res.send({ data: category, message: "Category updated successfully!" });
    } else {
      res.status(404).send({
        message: "Category Not Found!",
      });
    }
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    await ProductCategoryService.updateStatus(req.params.id, req.body.status, resolveStoreId(req));
    res.status(200).send({
      message: `Category ${req.body.status} Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    await ProductCategoryService.deleteCategory(req.params.id, resolveStoreId(req));
    res.status(200).send({
      message: "Category Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyCategories = async (req, res) => {
  try {
    await ProductCategoryService.deleteManyCategories(req.body.ids, resolveStoreId(req));
    res.send({
      message: "Categories Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addCategory,
  addAllCategories,
  getShowingCategories,
  getMostUsedCategories,
  getAllCategories,
  getCategoryById,
  getProductsByCategory,
  updateCategory,
  updateStatus,
  deleteCategory,
  deleteManyCategories,
};
