const AttributeService = require("../service/AttributeService");
const { resolveStoreId } = require("../utils/requestContext");

const addAttribute = async (req, res) => {
  try {
    const newAttribute = await AttributeService.createAttribute({ ...req.body, storeId: resolveStoreId(req) });
    res.send(newAttribute);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding attribute ${err.message}`,
    });
  }
};

const addAllAttributes = async (req, res) => {
  try {
    const storeId = resolveStoreId(req);
    const attributes = Array.isArray(req.body) ? req.body.map((a) => ({ ...a, storeId })) : [];
    await AttributeService.createManyAttributes(attributes);
    res.status(200).send({
      message: "Added all attributes successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllAttributes = async (req, res) => {
  try {
    const result = await AttributeService.getAllAttributes({ ...req.query, storeId: resolveStoreId(req) });
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingAttributes = async (req, res) => {
  try {
    const attributes = await AttributeService.getShowingAttributes(resolveStoreId(req));
    res.send(attributes);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAttributeById = async (req, res) => {
  try {
    const attribute = await AttributeService.getAttributeById(req.params.id, resolveStoreId(req));
    if (!attribute) {
      return res.status(404).send({ message: "Attribute Not Found!" });
    }
    res.send(attribute);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateAttribute = async (req, res) => {
  try {
    const attribute = await AttributeService.updateAttribute(
      req.params.id,
      req.body,
      resolveStoreId(req)
    );

    if (attribute) {
      res.send({ data: attribute, message: "Attribute updated successfully!" });
    } else {
      res.status(404).send({
        message: "Attribute Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteAttribute = async (req, res) => {
  try {
    const result = await AttributeService.deleteAttribute(req.params.id, resolveStoreId(req));
    if (!result) {
      return res.status(404).send({ message: "Attribute Not Found!" });
    }
    res.send({
      message: "Attribute Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyAttributes = async (req, res) => {
  try {
    const result = await AttributeService.deleteManyAttributes(req.body.ids, resolveStoreId(req));
    res.send({
      message: "Attributes Deleted Successfully!",
      result,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addAttribute,
  addAllAttributes,
  getAllAttributes,
  getShowingAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  deleteManyAttributes,
};
