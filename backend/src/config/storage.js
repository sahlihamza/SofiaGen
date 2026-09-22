const path = require("path");

module.exports = {
  uploadDirectory: path.resolve(__dirname, "../../public/uploads"),
  storageDriver: process.env.STORAGE_DRIVER || "local",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || "sofiagen",
  },
  s3: {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  gcs: {
    bucket: process.env.GCS_BUCKET,
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEYFILE || process.env.GOOGLE_APPLICATION_CREDENTIALS,
    uploadFolder: process.env.GCS_UPLOAD_FOLDER || "sofiagen",
  },
  azure: {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY,
    container: process.env.AZURE_STORAGE_CONTAINER || "sofiagen",
  },
  spaces: {
    endpoint: process.env.SPACES_ENDPOINT,
    bucket: process.env.SPACES_BUCKET,
    region: process.env.SPACES_REGION,
    accessKeyId: process.env.SPACES_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_KEY,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT,
    bucket: process.env.MINIO_BUCKET,
    region: process.env.MINIO_REGION,
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT,
    bucket: process.env.R2_BUCKET,
    region: process.env.R2_REGION,
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
};
