const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { azure: azureConfig } = require("../../config/storage");

class AzureProvider extends StorageProvider {
  constructor() {
    super();
    if (azureConfig.connectionString) {
      this.client = BlobServiceClient.fromConnectionString(azureConfig.connectionString);
    } else {
      const credential = new StorageSharedKeyCredential(azureConfig.accountName, azureConfig.accountKey);
      const url = `https://${azureConfig.accountName}.blob.core.windows.net`;
      this.client = new BlobServiceClient(url, credential);
    }
    this.containerName = azureConfig.container || "sofiagen";
    this.containerClient = this.client.getContainerClient(this.containerName);
  }

  async ensureContainer() {
    const exists = await this.containerClient.exists();
    if (!exists) {
      await this.containerClient.create();
    }
  }

  async upload(file, destinationPath, storeId) {
    await this.ensureContainer();
    const blobName = [storeId ? String(storeId) : "default", `${Date.now()}-${file.originalname}`].join("/");
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    return {
      provider: "azure",
      url: blockBlobClient.url,
      path: blobName,
      key: blobName,
    };
  }

  async delete(filePath, storeId) {
    const blockBlobClient = this.containerClient.getBlockBlobClient(filePath);
    await blockBlobClient.deleteIfExists();
    return true;
  }

  async list(storeId) {
    await this.ensureContainer();
    const prefix = `${storeId ? String(storeId) : "default"}/`;
    const files = [];
    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      files.push({
        provider: "azure",
        url: `https://${azureConfig.accountName}.blob.core.windows.net/${this.containerName}/${encodeURIComponent(blob.name)}`,
        key: blob.name,
        filename: path.basename(blob.name),
      });
    }
    return files;
  }
}

module.exports = AzureProvider;
