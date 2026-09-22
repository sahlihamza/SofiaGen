import requests from "./httpService";

const storeExportAPI = {
  requestExport: async ({ source, format = "csv", status, dateFrom, dateTo }) =>
    requests.post("/store/exports", { source, format, status, dateFrom, dateTo }),
  getStatus: async (jobId) => requests.get(`/store/exports/${jobId}`),
  downloadExport: async (jobId) => requests.getBlob(`/store/exports/${jobId}/download`),
};

export default storeExportAPI;
