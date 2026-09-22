const ShippingClass = require("../models/ShippingClass");
const { generateUniqueSlug } = require("../utils/slugify");

const getAllShippingClasses = async (storeId) => {
  const classes = await ShippingClass.find({ storeId }).sort({ name: 1 });

  return classes.map((shippingClass) => ({
    ...shippingClass.toObject(),
    productCount: 0,
  }));
};

const createShippingClass = async (storeId, data) => {
  const slug = await generateUniqueSlug(ShippingClass, storeId, data.slug || data.name);

  const shippingClass = await ShippingClass.create({
    storeId,
    name: data.name,
    slug,
    description: data.description || "",
  });

  return { ...shippingClass.toObject(), productCount: 0 };
};

const updateShippingClass = async (id, storeId, data) => {
  const shippingClass = await ShippingClass.findOne({ _id: id, storeId });
  if (!shippingClass) return null;

  shippingClass.name = data.name;
  shippingClass.description = data.description || "";
  shippingClass.slug = await generateUniqueSlug(
    ShippingClass,
    storeId,
    data.slug || data.name,
    id
  );

  await shippingClass.save();
  return { ...shippingClass.toObject(), productCount: 0 };
};

const deleteShippingClass = async (id, storeId) => {
  return ShippingClass.findOneAndDelete({ _id: id, storeId });
};

module.exports = {
  getAllShippingClasses,
  createShippingClass,
  updateShippingClass,
  deleteShippingClass,
};
