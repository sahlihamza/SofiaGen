const ProductTagService = require("../service/ProductTagService");
const { resolveStoreId } = require("../utils/requestContext");

const getDuplicateKeyResponse = (err) => {
  if (err?.code !== 11000) return null;
  const field = Object.keys(err?.keyPattern || {})[0];
  if (field !== "name" && field !== "slug") return null;
  return { message: "Tag name already exists!", code: "TAG_NAME_EXISTS" };
};

const addProductTag = async (req, res) => {
  try {
    const newTag = await ProductTagService.createProductTag({ ...req.body, storeId: resolveStoreId(req) });
    res.send(newTag);
  } catch (err) {
    const duplicateResponse = getDuplicateKeyResponse(err);
    if (duplicateResponse) {
      return res.status(409).send(duplicateResponse);
    }
    res.status(500).send({
      message: `Error occur when adding tag ${err.message}`,
    });
  }
};

const addAllProductTags = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const tags = Array.isArray(req.body) ? req.body.map((t) => ({ ...t, storeId })) : [];
    await ProductTagService.createManyProductTags(tags);
    res.status(200).send({
      message: "Added all tags successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllProductTags = async (req, res) => {
  try {
    const result = await ProductTagService.getAllProductTags({ ...req.query, storeId: resolveStoreId(req) });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductTagById = async (req, res) => {
  try {
    const tag = await ProductTagService.getProductTagById(req.params.id, resolveStoreId(req));
    if (!tag) {
      return res.status(404).send({ message: "Tag Not Found!" });
    }
    res.send(tag);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateProductTag = async (req, res) => {
  try {
    const tag = await ProductTagService.updateProductTag(
      req.params.id,
      req.body,
      resolveStoreId(req)
    );

    if (tag) {
      res.send({ data: tag, message: "Tag updated successfully!" });
    } else {
      res.status(404).send({
        message: "Tag Not Found!",
      });
    }
  } catch (err) {
    const duplicateResponse = getDuplicateKeyResponse(err);
    if (duplicateResponse) {
      return res.status(409).send(duplicateResponse);
    }
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteProductTag = async (req, res) => {
  try {
    const result = await ProductTagService.deleteProductTag(req.params.id, resolveStoreId(req));
    if (!result) {
      return res.status(404).send({ message: "Tag Not Found!" });
    }
    res.send({
      message: "Tag Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyProductTags = async (req, res) => {
  try {
    const result = await ProductTagService.deleteManyProductTags(req.body.ids, resolveStoreId(req));
    res.send({
      message: "Tags Deleted Successfully!",
      result,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addProductTag,
  addAllProductTags,
  getAllProductTags,
  getProductTagById,
  updateProductTag,
  deleteProductTag,
  deleteManyProductTags,
};
