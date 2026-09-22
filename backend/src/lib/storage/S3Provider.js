const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const StorageProvider = require("./StorageProvider");
const { s3: s3Config } = require("../../config/storage");

class S3Provider extends StorageProvider {
  constructor() {
    super();
    this.client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  async upload(file, destinationPath, storeId) {
    const key = `${storeId ? String(storeId) : "default"}/${Date.now()}-${file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await this.client.send(command);

    return {
      provider: "s3",
      url: `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`,
      path: key,
      key,
    };
  }

  async delete(filePath, storeId) {
    const command = new DeleteObjectCommand({
      Bucket: s3Config.bucket,
      Key: filePath,
    });
    await this.client.send(command);
    return true;
  }

  async list(storeId) {
    const prefix = `${storeId ? String(storeId) : "default"}/`;
    const command = new ListObjectsV2Command({
      Bucket: s3Config.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    return (response.Contents || []).map((item) => ({
      provider: "s3",
      url: `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${item.Key}`,
      key: item.Key,
      filename: path.basename(item.Key),
    }));
  }
}

module.exports = S3Provider;
