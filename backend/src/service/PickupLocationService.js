const PickupLocation = require("../models/PickupLocation");

const getAllPickupLocations = async (storeId) => {
  return PickupLocation.find({ storeId }).sort({ createdAt: 1 });
};

const createPickupLocation = async (storeId, data) => {
  return PickupLocation.create({
    storeId,
    name: data.name,
    addressLine1: data.addressLine1 || "",
    addressLine2: data.addressLine2 || "",
    city: data.city || "",
    postcode: data.postcode || "",
    country: data.country || "",
    details: data.details || "",
    enabled: data.enabled !== undefined ? !!data.enabled : true,
  });
};

const updatePickupLocation = async (id, storeId, data) => {
  const location = await PickupLocation.findOne({ _id: id, storeId });
  if (!location) return null;

  location.name = data.name;
  location.addressLine1 = data.addressLine1 || "";
  location.addressLine2 = data.addressLine2 || "";
  location.city = data.city || "";
  location.postcode = data.postcode || "";
  location.country = data.country || "";
  location.details = data.details || "";
  if (data.enabled !== undefined) {
    location.enabled = !!data.enabled;
  }

  await location.save();
  return location;
};

const deletePickupLocation = async (id, storeId) => {
  return PickupLocation.findOneAndDelete({ _id: id, storeId });
};

module.exports = {
  getAllPickupLocations,
  createPickupLocation,
  updatePickupLocation,
  deletePickupLocation,
};
