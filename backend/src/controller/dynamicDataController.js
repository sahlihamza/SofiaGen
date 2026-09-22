const dynamicDataSources = require("../config/dynamicDataSources");

exports.listDynamicDataSources = (req, res) => {
  try {
    const list = Object.entries(dynamicDataSources).map(([key, { label }]) => ({ key, label }));
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.previewDynamicData = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { source, params } = req.query;
    if (!storeId || !source) return res.status(400).json({ message: "storeId and source are required" });

    const src = dynamicDataSources[source];
    if (!src) return res.status(404).json({ message: "Unknown dynamic data source" });

    let parsedParams = {};
    if (params) {
      try {
        parsedParams = JSON.parse(params);
      } catch (e) {
        // allow simple query param key=value pairs as fallback
      }
    }

    const data = await src.resolve(storeId, parsedParams);
    res.json({ source, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
