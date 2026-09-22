const { Storage } = require("@google-cloud/storage");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { gcs: gcsConfig } = require("../../config/storage");

class GCSProvider extends StorageProvider {
  constructor() {
    super();
    const options = {};
    if (gcsConfig.projectId) options.projectId = gcsConfig.projectId;
    if (gcsConfig.keyFilename) options.keyFilename = gcsConfig.keyFilename;
    this.storage = new Storage(options);
    this.bucket = this.storage.bucket(gcsConfig.bucket);
    this.folder = gcsConfig.uploadFolder || "sofiagen";
  }

  async upload(file, destinationPath, storeId) {
    const key = [this.folder, storeId ? String(storeId) : "default", `${Date.now()}-${file.originalname}`]
      .filter(Boolean)
      .join("/");
    const fileRef = this.bucket.file(key);
    await fileRef.save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${encodeURIComponent(key)}`;
    return {
      provider: "gcs",
      url: publicUrl,
      path: key,
      key,
    };
  }

  async delete(filePath, storeId) {
    const key = filePath;
    const fileRef = this.bucket.file(key);
    await fileRef.delete({ ignoreNotFound: true });
    return true;
  }

  async list(storeId) {
    const prefix = [this.folder, storeId ? String(storeId) : "default"].filter(Boolean).join("/");
    const [files] = await this.bucket.getFiles({ prefix, autoPaginate: true });
    return files.map((file) => ({
      provider: "gcs",
      url: `https://storage.googleapis.com/${this.bucket.name}/${encodeURIComponent(file.name)}`,
      key: file.name,
      filename: path.basename(file.name),
    }));
  }
}

module.exports = GCSProvider;
