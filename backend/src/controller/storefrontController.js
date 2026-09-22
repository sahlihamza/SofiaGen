
const getCurrentStore = async (req, res) => {
  try {
    const store = req.storefrontStore;
    if (!store) {
      return res.status(404).json({ message: "Aucune boutique active" });
    }

    // Public projection only  a visitor has no account, so nothing here may
    // depend on staff auth.
    res.json({
      _id: store._id,
      name: store.name,
      logo: store.logo,
      address: store.address,
      currency: store.currency,
      reviewSettings: store.reviewSettings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCurrentStore };
