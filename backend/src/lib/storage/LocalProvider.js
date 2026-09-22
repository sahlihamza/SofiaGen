const fs = require("fs");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { uploadDirectory } = require("../../config/storage");

class LocalProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadDirectory = uploadDirectory;
    fs.mkdirSync(this.uploadDirectory, { recursive: true });
  }

  async upload(file, destinationPath, storeId) {
    const storeFolder = path.join(this.uploadDirectory, storeId ? String(storeId) : "default");
    fs.mkdirSync(storeFolder, { recursive: true });

    const filename = `${Date.now()}-${file.originalname}`;
    const localPath = path.join(storeFolder, filename);

    await fs.promises.writeFile(localPath, file.buffer);

    const backendUrl = (process.env.BACKEND_URL || "http://localhost:5055").replace(/\/$/, "");
    return {
      provider: "local",
      url: `${backendUrl}/static/uploads/${storeId ? String(storeId) : "default"}/${filename}`,
      path: localPath,
      key: filename,
    };
  }

  async delete(filePath, storeId) {
    const storeFolder = path.join(this.uploadDirectory, storeId ? String(storeId) : "default");
    const localPath = path.join(storeFolder, filePath);
    await fs.promises.unlink(localPath);
    return true;
  }

  async list(storeId) {
    const storeFolder = path.join(this.uploadDirectory, storeId ? String(storeId) : "default");
    await fs.promises.mkdir(storeFolder, { recursive: true });

    const files = await fs.promises.readdir(storeFolder);
    return files.map((filename) => ({
      provider: "local",
      url: `/static/uploads/${storeId ? String(storeId) : "default"}/${filename}`,
      key: filename,
      filename,
    }));
  }
}

module.exports = LocalProvider;
