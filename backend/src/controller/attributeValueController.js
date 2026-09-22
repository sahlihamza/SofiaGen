const AttributeValueService = require("../service/AttributeValueService");

const addValue = async (req, res) => {
  try {
    const value = await AttributeValueService.createValue(req.body);
    res.send(value);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding attribute value ${err.message}`,
    });
  }
};

const addAllValues = async (req, res) => {
  try {
    await AttributeValueService.createManyValues(req.body);
    res.status(200).send({
      message: "Added all attribute values successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getValuesByAttribute = async (req, res) => {
  try {
    const values = await AttributeValueService.getValuesByAttribute(
      req.params.attributeId
    );
    res.send(values);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getValueById = async (req, res) => {
  try {
    const value = await AttributeValueService.getValueById(req.params.id);
    res.send(value);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateValue = async (req, res) => {
  try {
    const value = await AttributeValueService.updateValue(
      req.params.id,
      req.body
    );

    if (value) {
      res.send({
        data: value,
        message: "Attribute value updated successfully!",
      });
    } else {
      res.status(404).send({
        message: "Attribute value Not Found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const setAttributeValues = async (req, res) => {
  try {
    const values = await AttributeValueService.setAttributeValues(
      req.params.attributeId,
      req.body.values
    );
    res.send({
      data: values,
      message: "Attribute values saved successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteValue = async (req, res) => {
  try {
    await AttributeValueService.deleteValue(req.params.id);
    res.send({
      message: "Attribute value Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addValue,
  addAllValues,
  getValuesByAttribute,
  getValueById,
  updateValue,
  setAttributeValues,
  deleteValue,
};
