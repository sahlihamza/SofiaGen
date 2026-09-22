const cloudinary = require("cloudinary").v2;
const StorageProvider = require("./StorageProvider");
const { cloudinary: cloudinaryConfig } = require("../../config/storage");

cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
});

class CloudinaryProvider extends StorageProvider {
  async upload(file, destinationPath, storeId) {
    const folder = [cloudinaryConfig.uploadFolder, storeId ? String(storeId) : "default"].filter(Boolean).join("/");
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, res) => {
        if (error) return reject(error);
        resolve(res);
      });
      uploadStream.end(file.buffer);
    });

    return {
      provider: "cloudinary",
      url: result.secure_url,
      path: result.public_id,
      key: result.public_id,
    };
  }

  async delete(filePath, storeId) {
    const publicId = filePath;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    return result.result === "ok" || result.result === "not found";
  }

  async list(storeId) {
    const prefix = [cloudinaryConfig.uploadFolder, storeId ? String(storeId) : "default"].filter(Boolean).join("/");
    const resources = await cloudinary.api.resources({ type: "upload", prefix, max_results: 500 });
    return resources.resources.map((resource) => ({
      provider: "cloudinary",
      url: resource.secure_url,
      key: resource.public_id,
      filename: resource.public_id.split("/").pop(),
    }));
  }
}

module.exports = CloudinaryProvider;
