const Gallery = require("../models/Gallery");

/**
 * Helper to normalize ObjectId for queries
 */
const toObjectId = (id) => {
  if (!id) return null;
  try {
    return new (require("mongoose").Schema.Types.ObjectId)(id);
  } catch {
    return null;
  }
};

const createGallery = async (data) => {
  const gallery = new Gallery(data);
  return await gallery.save();
};

const updateGallery = async (id, data) => {
  return await Gallery.findByIdAndUpdate(id, data, { new: true });
};

const deleteGallery = async (id) => {
  return await Gallery.findByIdAndDelete(id);
};

const getGalleryById = async (id) => {
  return await Gallery.findById(id);
};

const getGalleries = async ({
  storeId,
  category,
  tag,
  layout,
  sortBy = "newest",
  page = 1,
  limit = 12,
}) => {
  const query = { storeId: toObjectId(storeId) };

  if (typeof isActive !== "undefined") {
    query.isActive = isActive;
  }
  if (category) query.category = category;
  if (layout) query["settings.layout"] = layout;

  if (tag) {
    query.tags = tag;
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    title: { title: 1 },
  };

  const sort = sortMap[sortBy] || { createdAt: -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [total, items] = await Promise.all([
    Gallery.countDocuments(query),
    Gallery.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
  ]);

  return {
    data: items,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: skip + items.length < total,
  };
};

const getPublicGalleries = async ({
  storeId,
  category,
  tag,
  layout,
  sortBy = "newest",
  page = 1,
  limit = 12,
}) => {
  const query = { storeId: toObjectId(storeId), isActive: true };

  if (category) query.category = category;
  if (layout) query["settings.layout"] = layout;
  if (tag) query.tags = tag;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    title: { title: 1 },
  };

  const sort = sortMap[sortBy] || { createdAt: -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [total, items] = await Promise.all([
    Gallery.countDocuments(query),
    Gallery.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
  ]);

  return {
    data: items,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: skip + items.length < total,
  };
};

const getGalleryByCategory = async (storeId, category, limit = 12) => {
  return await Gallery.find({ storeId: toObjectId(storeId), isActive: true, category })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

const getGalleryByIds = async (ids) => {
  if (!ids || !ids.length) return [];
  return await Gallery.find({ _id: { $in: ids.map((id) => toObjectId(id)).filter(Boolean) } }).lean();
};

const addImage = async (galleryId, imageData) => {
  return await Gallery.findByIdAndUpdate(
    galleryId,
    { $push: { images: imageData } },
    { new: true }
  );
};

const removeImage = async (galleryId, imageId) => {
  return await Gallery.findByIdAndUpdate(
    galleryId,
    { $pull: { images: { _id: toObjectId(imageId) } } },
    { new: true }
  );
};

const reorderImages = async (galleryId, imageIds) => {
  const gallery = await Gallery.findById(galleryId);
  if (!gallery) return null;

  const imageMap = new Map();
  gallery.images.forEach((img) => {
    imageMap.set(String(img._id), img);
  });

  const reordered = imageIds
    .map((id, index) => {
      const img = imageMap.get(id);
      if (!img) return null;
      return { ...img.toObject(), order: index };
    })
    .filter(Boolean);

  gallery.images = reordered;
  await gallery.save();
  return gallery;
};

module.exports = {
  createGallery,
  updateGallery,
  deleteGallery,
  getGalleryById,
  getGalleries,
  getPublicGalleries,
  getGalleryByCategory,
  getGalleryByIds,
  addImage,
  removeImage,
  reorderImages,
};
