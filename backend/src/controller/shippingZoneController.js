const ShippingZoneService = require("../service/ShippingZoneService");
const StoreCarrierProvider = require("../models/shipping/StoreCarrierProvider");

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

const addShippingZone = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const newShippingZone = await ShippingZoneService.createShippingZone(
      storeId,
      req.body
    );
    res.send(newShippingZone);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding shipping zone ${err.message}`,
    });
  }
};

const getAllShippingZones = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    // Self-heals stores created before the default zone was auto-seeded on
    // store creation  same lazy pattern payment/email settings already use.
    await ShippingZoneService.seedDefaultZoneForStore(storeId);

    const result = await ShippingZoneService.getAllShippingZones(storeId);
    res.send(result);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateShippingZone = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const zone = await ShippingZoneService.updateShippingZone(
      req.params.id,
      storeId,
      req.body
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone not found" });
    }

    res.send(zone);
  } catch (err) {
    if (err.name === "InvalidShippingMode") {
      return res.status(422).send({ message: err.message });
    }
    if (err.name === "MissingCarrierProvider") {
      return res.status(422).send({ message: err.message });
    }
    if (err.name === "CarrierProviderNotFound") {
      return res.status(422).send({ message: err.message });
    }
    res.status(500).send({
      message: `Error occur when updating shipping zone ${err.message}`,
    });
  }
};

const deleteShippingZone = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const zone = await ShippingZoneService.deleteShippingZone(
      req.params.id,
      storeId
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone not found" });
    }

    res.send({ message: "Shipping zone deleted successfully" });
  } catch (err) {
    if (err.name === "CannotDeleteDefaultZone") {
      return res.status(403).send({ message: err.message });
    }
    res.status(500).send({
      message: `Error occur when deleting shipping zone ${err.message}`,
    });
  }
};

const reorderShippingZones = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(422).send({
        message: "'orderedIds' must be a non-empty array",
      });
    }

    const zones = await ShippingZoneService.reorderShippingZones(
      storeId,
      orderedIds
    );
    res.send(zones);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when reordering shipping zones ${err.message}`,
    });
  }
};

const addShippingMethod = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const zone = await ShippingZoneService.addShippingMethod(
      req.params.zoneId,
      storeId,
      req.body
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone not found" });
    }

    res.send(zone);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding shipping method ${err.message}`,
    });
  }
};

const updateShippingMethod = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const zone = await ShippingZoneService.updateShippingMethod(
      req.params.zoneId,
      storeId,
      req.params.methodId,
      req.body
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone or method not found" });
    }

    res.send(zone);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when updating shipping method ${err.message}`,
    });
  }
};

const deleteShippingMethod = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const zone = await ShippingZoneService.deleteShippingMethod(
      req.params.zoneId,
      storeId,
      req.params.methodId
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone or method not found" });
    }

    res.send(zone);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when deleting shipping method ${err.message}`,
    });
  }
};

const reorderShippingMethods = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(422).send({
        message: "'orderedIds' must be a non-empty array",
      });
    }

    const zone = await ShippingZoneService.reorderShippingMethods(
      req.params.zoneId,
      storeId,
      orderedIds
    );

    if (!zone) {
      return res.status(404).send({ message: "Shipping zone not found" });
    }

    res.send(zone);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when reordering shipping methods ${err.message}`,
    });
  }
};

const getAvailableCarriers = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const activeCarriers = await StoreCarrierProvider.find({
      storeId,
      isActive: true,
    }).select('_id carrierProviderId isActive -__v');

    if (!activeCarriers || activeCarriers.length === 0) {
      return res.status(200).send({
        carriers: [],
        message: "No active carriers configured. Please connect a carrier first at /integrations/delivery",
      });
    }

    res.send({ carriers: activeCarriers });
  } catch (err) {
    res.status(500).send({
      message: `Error fetching available carriers: ${err.message}`,
    });
  }
};

module.exports = {
  addShippingZone,
  getAllShippingZones,
  updateShippingZone,
  deleteShippingZone,
  reorderShippingZones,
  addShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  reorderShippingMethods,
  getAvailableCarriers,
};
