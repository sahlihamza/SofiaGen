const PickupLocationService = require("../service/PickupLocationService");

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

const getAllPickupLocations = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const locations = await PickupLocationService.getAllPickupLocations(storeId);
    res.send(locations);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const addPickupLocation = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const location = await PickupLocationService.createPickupLocation(storeId, req.body);
    res.send(location);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when adding pickup location ${err.message}`,
    });
  }
};

const updatePickupLocation = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const location = await PickupLocationService.updatePickupLocation(
      req.params.id,
      storeId,
      req.body
    );

    if (!location) {
      return res.status(404).send({ message: "Pickup location not found" });
    }

    res.send(location);
  } catch (err) {
    res.status(500).send({
      message: `Error occur when updating pickup location ${err.message}`,
    });
  }
};

const deletePickupLocation = async (req, res) => {
  try {
    const storeId = requireCurrentStoreId(req, res);
    if (!storeId) return;

    const location = await PickupLocationService.deletePickupLocation(
      req.params.id,
      storeId
    );

    if (!location) {
      return res.status(404).send({ message: "Pickup location not found" });
    }

    res.send({ message: "Pickup location deleted successfully" });
  } catch (err) {
    res.status(500).send({
      message: `Error occur when deleting pickup location ${err.message}`,
    });
  }
};

module.exports = {
  getAllPickupLocations,
  addPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
};
