const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { minio: minioConfig } = require("../../config/storage");

class MinIOProvider extends StorageProvider {
  constructor() {
    super();
    const endpoint = minioConfig.endpoint.replace(/\/$/, "");
    this.client = new S3Client({
      region: minioConfig.region || "us-east-1",
      endpoint,
      credentials: {
        accessKeyId: minioConfig.accessKeyId,
        secretAccessKey: minioConfig.secretAccessKey,
      },
      forcePathStyle: true,
    });
    this.bucket = minioConfig.bucket;
    this.endpoint = endpoint;
  }

  async upload(file, destinationPath, storeId) {
    const key = [storeId ? String(storeId) : "default", `${Date.now()}-${file.originalname}`].join("/");
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await this.client.send(command);
    const url = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;

    return {
      provider: "minio",
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
      provider: "minio",
      url: `${this.endpoint}/${this.bucket}/${encodeURIComponent(item.Key)}`,
      key: item.Key,
      filename: path.basename(item.Key),
    }));
  }
}

module.exports = MinIOProvider;
