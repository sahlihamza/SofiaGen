const logger = require("../../config/logger");
//models
const Setting = require("../../models/Setting");

const getGlobalSetting = async (data) => {
  try {

    const globalSetting = await Setting.findOne({
      name: "globalSetting",
    });
    return globalSetting?.setting;
  } catch (err) {
    logger.error("err when getting global setting", err.message);
  }
};

const getStoreCustomizationSetting = async (data) => {
  try {
    const storeCustomizationSetting = await Setting.findOne({
      name: "storeCustomizationSetting",
    });
    return storeCustomizationSetting?.setting;
  } catch (err) {
    logger.error("err when getting storeCustomizationSetting setting", err.message);
  }
};

module.exports = {
  getGlobalSetting,
  getStoreCustomizationSetting,
};
