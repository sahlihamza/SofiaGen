const Brand = require("../models/Brand");

const createBrand = async (data) => {
  const newBrand = new Brand(data);
  return newBrand.save();
};

// additive bulk insert used by the CSV/JSON import feature; ordered:false so
// one bad/duplicate row doesn't block the rest of the batch.
const insertManyBrands = async (docs) => {
  return Brand.insertMany(docs, { ordered: false });
};

const SORT_OPTIONS = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  date_asc: { createdAt: 1 },
  date_desc: { createdAt: -1 },
};

const getAllBrands = async ({ name, status, page, limit, sort, storeId }) => {
  const queryObject = { storeId, deletedAt: null };

  if (name) {
    queryObject.name = { $regex: `${name}`, $options: "i" };
  }
  if (status !== undefined && status !== "") {
    queryObject.status = status === "true" || status === true;
  }

  const pages = Number(page) || 1;
  const limits = Number(limit) || 0;
  const skip = (pages - 1) * limits;
  const sortObject = SORT_OPTIONS[sort] || { _id: -1 };

  const totalDoc = await Brand.countDocuments(queryObject);
  const brands = await Brand.find(queryObject)
    .sort(sortObject)
    .skip(skip)
    .limit(limits);

  return { brands, totalDoc, limits, pages };
};

const getBrandById = async (id, storeId) => {
  return Brand.findOne({ _id: id, storeId, deletedAt: null });
};

const updateBrand = async (id, data, storeId) => {
  const brand = await Brand.findOne({ _id: id, storeId, deletedAt: null });

  if (!brand) return null;

  if (data.name !== undefined) brand.name = data.name;
  if (data.description !== undefined) brand.description = data.description;
  if (data.logo !== undefined) brand.logo = data.logo;
  if (data.website !== undefined) brand.website = data.website;
  if (data.status !== undefined) brand.status = data.status;
  if (data.slug !== undefined) brand.slug = data.slug;

  return brand.save();
};

const deleteBrand = async (id, storeId) => {
  return Brand.findOneAndUpdate(
    { _id: id, storeId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true }
  );
};

module.exports = {
  createBrand,
  insertManyBrands,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
