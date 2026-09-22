const ProductService = require("../service/ProductService");

const addProduct = async (req, res) => {
  try {
    const newProduct = await ProductService.createProduct({ ...req.body, storeId: req.authContext?.storeId });
    res.send(newProduct);
  } catch (err) {
    if (err.code === "QUOTA_EXCEEDED") {
      return res.status(409).send({ message: err.message, code: err.code });
    }
    res.status(500).send({
      message: err.message,
    });
  }
};

const addAllProducts = async (req, res) => {
  try {
    const report = await ProductService.importProducts(req.body, {
      createdBy: req.user?._id,
      storeId: req.authContext?.storeId,
    });

    const summary =
      `${report.created} created, ${report.updated} updated` +
      (report.skipped ? `, ${report.skipped} skipped` : "");

    res.status(200).send({ message: `Import finished: ${summary}.`, ...report });
  } catch (err) {
    res.status(400).send({
      message: err.message,
    });
  }
};

const getShowingProducts = async (req, res) => {
  try {
    const storeId = req.query?.storeId || req.authContext?.storeId || req.currentStoreId;
    const products = await ProductService.getShowingProducts({ ...req.query, storeId });
    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const storeId = req.authContext?.storeId;
    const result = await ProductService.getAllProducts({ ...req.query, storeId });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await ProductService.getProductById(req.params.id, req.authContext?.storeId);
    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body, req.authContext?.storeId);

    if (product) {
      res.send({ data: product, message: "Product updated successfully!" });
    } else {
      res.status(404).send({
        message: "Product Not Found!",
      });
    }
  } catch (err) {
    res.status(404).send(err.message);
  }
};

const updateManyProducts = async (req, res) => {
  try {
    await ProductService.updateManyProducts(req.body.ids, req.body, req.authContext?.storeId);
    res.send({
      message: "Products update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    await ProductService.updateStatus(req.params.id, req.body.status, req.authContext?.storeId);
    res.status(200).send({
      message: `Product ${req.body.status} Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await ProductService.deleteProduct(req.params.id, req.authContext?.storeId);
    res.status(200).send({
      message: "Product Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: "Server error: unable to delete the product. Please try again later.",
      error: err.message,
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    // SO-19: an explicit ?storeId= (an authenticated admin preview call, or
    // an old integration) wins; resolveStorefrontStore's domain-derived
    // req.currentStoreId is the real default for a genuinely anonymous
    // storefront visitor who never passed one; req.authContext.storeId
    // covers the rare authenticated call into this same public route.
    const storeId = req.query?.storeId || req.authContext?.storeId || req.currentStoreId;
    const products = await ProductService.searchProducts({ ...req.query, storeId });
    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: "Server error: unable to search products. Please try again later.",
      error: err.message,
    });
  }
};

const getShowingStoreProducts = async (req, res) => {
  try {
    // Same precedence as searchProducts  see comment there.
    const storeId = req.query?.storeId || req.authContext?.storeId || req.currentStoreId;
    const result = await ProductService.getShowingStoreProducts({ ...req.query, storeId });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getRelatedProducts = async (req, res) => {
  try {
    const { productId, limit = 4 } = req.query;
    if (!productId) {
      return res.status(400).json({ success: true, data: [] });
    }
    const relatedStoreId = req.query?.storeId || req.authContext?.storeId || req.currentStoreId;
    const products = await ProductService.getRelatedProducts(productId, parseInt(limit, 10), relatedStoreId);
    res.status(200).json({ success: true, data: products });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyProducts = async (req, res) => {
  try {
    await ProductService.deleteManyProducts(req.body.ids, req.authContext?.storeId);
    res.send({
      message: `Products Delete Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Fetch multiple products by their ids (for recently viewed, wishlist, etc.).
// Accepts ids as a comma/space separated query string or as an array.
const getProductsByIds = async (req, res) => {
  try {
    let ids = req.query.ids;
    if (typeof ids === "string") {
      ids = ids.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).send([]);
    }
    const byIdsStoreId = req.query?.storeId || req.authContext?.storeId || req.currentStoreId;
    const products = await ProductService.getProductsByIds(ids, byIdsStoreId);
    res.send(products);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductsByIds,
  searchProducts,
  getProductById,
  getRelatedProducts,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
};
