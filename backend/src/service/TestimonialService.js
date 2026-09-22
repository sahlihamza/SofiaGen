const Testimonial = require("../models/Testimonial");
const mongoose = require("mongoose");
const { Types: { ObjectId } } = mongoose;

// Cast défensif : storeId peut arriver en string depuis une query.
const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : id);

const createTestimonial = async (data) => {
  const testimonial = new Testimonial(data);
  return await testimonial.save();
};

const updateTestimonial = async (id, data) => {
  return await Testimonial.findByIdAndUpdate(id, data, { new: true });
};

const deleteTestimonial = async (id) => {
  return await Testimonial.findByIdAndDelete(id);
};

const getTestimonialById = async (id) => {
  return await Testimonial.findById(id);
};

const getTestimonials = async ({
  storeId,
  category,
  rating,
  isApproved,
  isFeatured,
  locale,
  sortBy = "newest",
  page = 1,
  limit = 12,
  search = "",
}) => {
  const query = { storeId: toObjectId(storeId) };

  if (typeof isApproved === "boolean") query.isApproved = isApproved;
  if (typeof isFeatured === "boolean") query.isFeatured = isFeatured;
  if (category) query.category = category;
  if (rating) query.rating = { $gte: Number(rating) };
  if (locale) query.locale = locale;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { text: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
      { role: { $regex: search, $options: "i" } },
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    "rating-high": { rating: -1, createdAt: -1 },
    "rating-low": { rating: 1, createdAt: -1 },
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
  };

  // "random" ne se traduit pas en tri : on l'évalue via $sample (aggregate).
  if (sortBy === "random") {
    const items = await Testimonial.aggregate([
      { $match: query },
      { $sample: { size: Number(limit) } },
    ]);
    return {
      data: items,
      total: items.length,
      page: Number(page),
      totalPages: 1,
      hasMore: false,
    };
  }

  const sort = sortMap[sortBy] || { createdAt: -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [total, items] = await Promise.all([
    Testimonial.countDocuments(query),
    Testimonial.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
  ]);

  return {
    data: items,
    total,
    page: Number(page),
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: skip + items.length < total,
  };
};

const getFeaturedTestimonials = async (storeId, limit = 6) => {
  return await Testimonial.find({ storeId, isApproved: true, isFeatured: true })
    .sort({ rating: -1, createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

const getTestimonialsByRating = async (storeId, minRating = 4, limit = 10) => {
  return await Testimonial.find({
    storeId,
    isApproved: true,
    rating: { $gte: Number(minRating) },
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

const getRandomTestimonials = async (storeId, limit = 6) => {
  return await Testimonial.aggregate([
    { $match: { storeId: toObjectId(storeId), isApproved: true } },
    { $sample: { size: Number(limit) } },
  ]);
};

const getTestimonialStats = async (storeId) => {
  const [total, distribution] = await Promise.all([
    Testimonial.countDocuments({ storeId: toObjectId(storeId), isApproved: true }),
    Testimonial.aggregate([
      { $match: { storeId: toObjectId(storeId), isApproved: true } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const ratingMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => {
    ratingMap[d._id] = d.count;
  });

  const ratings = Object.values(ratingMap);
  const totalWeighted = ratings.reduce((s, c, i) => s + c * (i + 1), 0);
  const totalCount = ratings.reduce((s, c) => s + c, 0);
  const averageRating = totalCount > 0 ? parseFloat((totalWeighted / totalCount).toFixed(2)) : 0;

  return { total, averageRating, distribution: ratingMap };
};

const bulkUpdateStatus = async (ids, isApproved) => {
  return await Testimonial.updateMany(
    { _id: { $in: ids } },
    { $set: { isApproved } }
  );
};

const bulkDelete = async (ids) => {
  return await Testimonial.deleteMany({ _id: { $in: ids } });
};

module.exports = {
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getTestimonialById,
  getTestimonials,
  getFeaturedTestimonials,
  getTestimonialsByRating,
  getRandomTestimonials,
  getTestimonialStats,
  bulkUpdateStatus,
  bulkDelete,
};
