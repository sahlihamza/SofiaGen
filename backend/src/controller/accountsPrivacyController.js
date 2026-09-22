const accountsPrivacyService = require("../service/accountsPrivacyService");

// Was a stub (always 501)  the service layer (accountsPrivacyService.js)
// and the whole frontend section were already fully built and just waiting
// on this controller to actually call them.
const accountsPrivacyController = {
  getSettings: async (req, res) => {
    try {
      const settings = await accountsPrivacyService.getByStoreId(req.params.storeId);
      return res.status(200).json({ success: true, data: settings });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const settings = await accountsPrivacyService.upsertByStoreId(
        req.params.storeId,
        req.body,
        req.user
      );
      return res.status(200).json({ success: true, data: settings });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(422).json({ success: false, message: error.message, errors: error.errors });
      }
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = accountsPrivacyController;
