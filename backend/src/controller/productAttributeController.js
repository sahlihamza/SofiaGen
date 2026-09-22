const ProductAttributeService = require("../service/ProductAttributeService");

const linkAttribute = async (req, res) => {
  try {
    const link = await ProductAttributeService.linkAttribute(req.body);
    res.send(link);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when linking attribute ${err.message}`,
    });
  }
};

const getAttributesByProduct = async (req, res) => {
  try {
    const links = await ProductAttributeService.getAttributesByProduct(
      req.params.productId
    );
    res.send(links);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductsByAttribute = async (req, res) => {
  try {
    const links = await ProductAttributeService.getProductsByAttribute(
      req.params.attributeId
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
    const link = await ProductAttributeService.getLinkById(req.params.id);
    res.send(link);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateLink = async (req, res) => {
  try {
    const link = await ProductAttributeService.updateLink(
      req.params.id,
      req.body
    );

    if (link) {
      res.send({ data: link, message: "Product attribute updated successfully!" });
    } else {
      res.status(404).send({
        message: "Product attribute link Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const setProductAttributes = async (req, res) => {
  try {
    const links = await ProductAttributeService.setProductAttributes(
      req.params.productId,
      req.body.attributes
    );
    res.send({ data: links, message: "Product attributes saved successfully!" });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteLink = async (req, res) => {
  try {
    await ProductAttributeService.deleteLink(req.params.id);
    res.send({
      message: "Product attribute link Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  linkAttribute,
  getAttributesByProduct,
  getProductsByAttribute,
  getLinkById,
  updateLink,
  setProductAttributes,
  deleteLink,
};
