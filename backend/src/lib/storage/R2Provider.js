const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { r2: r2Config } = require("../../config/storage");

class R2Provider extends StorageProvider {
  constructor() {
    super();
    const endpoint = r2Config.endpoint.replace(/\/$/, "");
    this.client = new S3Client({
      region: r2Config.region || "auto",
      endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.bucket = r2Config.bucket;
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
    const url = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;

    return {
      provider: "r2",
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
    return (response.Contents || []).map((item) => ({
      provider: "r2",
      url: `${this.endpoint}/${this.bucket}/${encodeURIComponent(item.Key)}`,
      key: item.Key,
      filename: path.basename(item.Key),
    }));
  }
}

module.exports = R2Provider;
