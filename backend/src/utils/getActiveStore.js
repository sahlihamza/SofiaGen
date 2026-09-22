const Store = require("../models/Store");

// The blog module is scoped per-store (SaaS), but this app has no per-user
// store assignment yet  "current store" is the same global Store.isSelected
// singleton already used for the storefront logo/theme. Every posts/*
// service derives storeId from here instead of trusting a client-supplied id.
const getActiveStoreId = async () => {
  const store = await Store.findOne({ isSelected: true });
  if (!store) {
    const error = new Error("Aucune boutique active sélectionné");
    error.code = "NO_ACTIVE_STORE";
    throw error;
  }
  return store._id;
};

module.exports = { getActiveStoreId };
