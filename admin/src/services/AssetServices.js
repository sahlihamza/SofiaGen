import requests from "./httpService";

const AssetServices = {
  listAssets: () => requests.get("/assets"),
  uploadAsset: (formData, config = {}) => requests.post("/assets/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...config.headers,
    },
    ...config,
  }),
  deleteAsset: (assetId) => requests.delete(`/assets/${assetId}`),
};

export default AssetServices;
