const ProductTagRelationService = require("../service/ProductTagRelationService");

const linkTag = async (req, res) => {
  try {
    const link = await ProductTagRelationService.linkTag(req.body);
    res.send(link);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when linking tag ${err.message}`,
    });
  }
};

const getTagsByProduct = async (req, res) => {
  try {
    const links = await ProductTagRelationService.getTagsByProduct(
      req.params.productId
    );
    res.send(links);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductsByTag = async (req, res) => {
  try {
    const links = await ProductTagRelationService.getProductsByTag(
      req.params.tagId
    );
    res.send(links);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getLinkById = async (req, res) => {
  try {
    const link = await ProductTagRelationService.getLinkById(req.params.id);
    res.send(link);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const setProductTags = async (req, res) => {
  try {
    const links = await ProductTagRelationService.setProductTags(
      req.params.productId,
      req.body.tags
    );
    res.send({ data: links, message: "Product tags saved successfully!" });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteLink = async (req, res) => {
  try {
    await ProductTagRelationService.deleteLink(req.params.id);
    res.send({
      message: "Product tag link Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  linkTag,
  getTagsByProduct,
  getProductsByTag,
  getLinkById,
  setProductTags,
  deleteLink,
};
