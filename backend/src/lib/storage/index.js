const { storageDriver } = require("../../config/storage");

const providerMap = {
  local: () => require("./LocalProvider"),
  cloudinary: () => require("./CloudinaryProvider"),
  s3: () => require("./S3Provider"),
  gcs: () => require("./GCSProvider"),
  azure: () => require("./AzureProvider"),
  spaces: () => require("./SpacesProvider"),
  minio: () => require("./MinIOProvider"),
  r2: () => require("./R2Provider"),
};

const loader = providerMap[storageDriver] || providerMap.local;
const ProviderClass = loader();
module.exports = new ProviderClass();
