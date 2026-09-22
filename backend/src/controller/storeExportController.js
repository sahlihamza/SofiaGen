const ExportJobService = require("../service/ExportJobService");

const ALLOWED_SOURCES = ["orders", "customers", "products"];

const requestStoreExport = async (req, res) => {
  try {
    const { source, format = "csv" } = req.body;
    if (!ALLOWED_SOURCES.includes(source)) {
      return res.status(400).json({ success: false, message: `source must be one of: ${ALLOWED_SOURCES.join(", ")}` });
    }
    if (!["csv", "json"].includes(format)) {
      return res.status(400).json({ success: false, message: "format must be csv or json" });
    }

    const storeId = req.currentStoreId || req.user?.currentStoreId || null;
    if (!storeId) {
      return res.status(409).json({ success: false, message: "No active store selected" });
    }

    // storeId comes exclusively from the authenticated request's own store
    // context, never from the request body  this is precisely the scoping
    // bug class SO-02/SO-04 already happened once in this project.
    const filters = {
      storeId,
      status: req.body.status,
      dateFrom: req.body.dateFrom,
      dateTo: req.body.dateTo,
    };

    const job = await ExportJobService.requestExport({
      requestedBy: req.user._id,
      source,
      format,
      filters,
    });

    return res.status(202).json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getStoreExportStatus = async (req, res) => {
  try {
    const job = await ExportJobService.getStatus(req.params.jobId, req.user);
    if (!job) return res.status(404).json({ success: false, message: "Export not found" });
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const downloadStoreExport = async (req, res) => {
  try {
    const { stream, fileName } = await ExportJobService.getDownloadStream(req.params.jobId, req.user);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
    } else if (ext === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    stream.pipe(res);
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

module.exports = { requestStoreExport, getStoreExportStatus, downloadStoreExport };
