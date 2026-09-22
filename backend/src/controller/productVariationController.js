const ProductVariationService = require("../service/ProductVariationService");

const createVariation = async (req, res) => {
  try {
    const variation = await ProductVariationService.createVariation(req.body);
    res.send(variation);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when creating variation ${err.message}`,
    });
  }
};

const getVariationsByProduct = async (req, res) => {
  try {
    const variations = await ProductVariationService.getVariationsByProduct(
      req.params.productId
    );
    res.send(variations);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getVariationById = async (req, res) => {
  try {
    const variation = await ProductVariationService.getVariationById(
      req.params.id
    );
    res.send(variation);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateVariation = async (req, res) => {
  try {
    const variation = await ProductVariationService.updateVariation(
      req.params.id,
      req.body
    );

    if (variation) {
      res.send({
        data: variation,
        message: "Product variation updated successfully!",
      });
    } else {
      res.status(404).send({
        message: "Product variation Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const setProductVariations = async (req, res) => {
  try {
    const variations = await ProductVariationService.setProductVariations(
      req.params.productId,
      req.body.variations
    );
    res.send({
      data: variations,
      message: "Product variations saved successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteVariation = async (req, res) => {
  try {
    await ProductVariationService.deleteVariation(req.params.id);
    res.send({
      message: "Product variation Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  createVariation,
  getVariationsByProduct,
  getVariationById,
  updateVariation,
  setProductVariations,
  deleteVariation,
};
