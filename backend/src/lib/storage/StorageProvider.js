class StorageProvider {
  async upload(file, destinationPath, storeId) {
    throw new Error("upload() not implemented");
  }

  async delete(filePath, storeId) {
    throw new Error("delete() not implemented");
  }

  async list(storeId) {
    throw new Error("list() not implemented");
  }
}

module.exports = StorageProvider;
