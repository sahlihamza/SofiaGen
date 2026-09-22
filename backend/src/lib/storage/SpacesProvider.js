const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { spaces: spacesConfig } = require("../../config/storage");

class SpacesProvider extends StorageProvider {
  constructor() {
    super();
    const endpoint = spacesConfig.endpoint;
    this.client = new S3Client({
      region: spacesConfig.region,
      endpoint,
      credentials: {
        accessKeyId: spacesConfig.accessKeyId,
        secretAccessKey: spacesConfig.secretAccessKey,
      },
    });
    this.bucket = spacesConfig.bucket;
    this.endpoint = endpoint;
  }

  async upload(file, destinationPath, storeId) {
    const key = [storeId ? String(storeId) : "default", `${Date.now()}-${file.originalname}`].join("/");
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    });
    await this.client.send(command);
    const endpoint = this.endpoint.replace(/\/$/, "");
    const url = `${endpoint}/${this.bucket}/${encodeURIComponent(key)}`;

    return {
      provider: "spaces",
      url,
      path: key,
      key,
    };
  }

  async delete(filePath, storeId) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    await this.client.send(command);
    return true;
  }

  async list(storeId) {
    const prefix = `${storeId ? String(storeId) : "default"}/`;
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    const endpoint = this.endpoint.replace(/\/$/, "");
    return (response.Contents || []).map((item) => ({
      provider: "spaces",
      url: `${endpoint}/${this.bucket}/${encodeURIComponent(item.Key)}`,
      key: item.Key,
      filename: path.basename(item.Key),
    }));
  }
}

module.exports = SpacesProvider;
