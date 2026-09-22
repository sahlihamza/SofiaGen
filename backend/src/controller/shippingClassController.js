const ShippingClassService = require("../service/ShippingClassService");

const requireCurrentStoreId = (req, res) => {
  const storeId = req.currentStoreId || req.user?.currentStoreId;
  if (!storeId) {
    res.status(400).json({
      success: false,
      message: "Aucun store sélectionné pour cet utilisateur",
    });
    return null;
  }
  return storeId;
};

const getAllShippingClasses = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const classes = await ShippingClassService.getAllShippingClasses(storeId);
    res.send(classes);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const addShippingClass = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const shippingClass = await ShippingClassService.createShippingClass(
      storeId,
      req.body
    );
    res.send(shippingClass);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding shipping class ${err.message}`,
    });
  }
};

const updateShippingClass = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const shippingClass = await ShippingClassService.updateShippingClass(
      req.params.id,
      storeId,
      req.body
    );

    if (!shippingClass) {
      return res.status(404).send({ message: "Shipping class not found" });
    }

    res.send(shippingClass);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when updating shipping class ${err.message}`,
    });
  }
};

const deleteShippingClass = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const shippingClass = await ShippingClassService.deleteShippingClass(
      req.params.id,
      storeId
    );

    if (!shippingClass) {
      return res.status(404).send({ message: "Shipping class not found" });
    }

    res.send({ message: "Shipping class deleted successfully" });
  } catch (err) {
    res.status(500).send({
      message: `Error occur when deleting shipping class ${err.message}`,
    });
  }
};

module.exports = {
  getAllShippingClasses,
  addShippingClass,
  updateShippingClass,
  deleteShippingClass,
};
