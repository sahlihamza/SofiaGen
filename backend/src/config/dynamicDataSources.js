module.exports = {
  "store.name": {
    label: "Nom de la boutique",
    resolve: async (storeId) => (await require("../models/Store").findById(storeId).select("name").lean())?.name || "",
  },
  "store.logo": {
    label: "Logo de la boutique",
    resolve: async (storeId) => (await require("../models/Store").findById(storeId).select("logo").lean())?.logo || "",
  },
  "products.latest": {
    label: "Derniers produits",
    resolve: async (storeId, params = {}) => {
      const Product = require("../models/Product");
      const limit = params.limit || 8;
      return Product.find({ storeId, isActive: true }).sort({ createdAt: -1 }).limit(limit).lean();
    },
  },
  "products.featured": {
    label: "Produits en vedette",
    resolve: async (storeId, params = {}) => {
      const Product = require("../models/Product");
      return Product.find({ storeId, isFeatured: true }).limit(params.limit || 8).lean();
    },
  },
  "promotion.active": {
    label: "Promotion active",
    resolve: async (storeId) => {
      const Coupon = require("../models/Coupon");
      const now = new Date();
      return Coupon.findOne({ storeId, isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } }).lean();
    },
  },
  "category.image": {
    label: "Image de catégorie (contextuelle)",
    resolve: async (storeId, params = {}) => {
      if (!params.categoryId) return "";
      const Category = require("../models/Category");
      return (await Category.findById(params.categoryId).select("image").lean())?.image || "";
    },
  },
  "product.current": {
    label: "Produit de la page courante",
    resolve: async (storeId, params = {}) => {
      if (!params.productId) return null;
      const Product = require("../models/Product");
      return await Product.findById(params.productId)
        .populate("productCategory", "name")
        .populate("brand", "name logo")
        .populate("productGallery")
        .populate({
          path: "productAttributes",
          populate: { path: "attribute", select: "name values isVisible usedForVariation" },
        })
        .populate({
          path: "productTags",
          populate: { path: "tagId", select: "name color" },
        })
        .lean();
    },
  },
  "product.stock": {
    label: "Stock du produit courant",
    resolve: async (storeId, params = {}) => {
      if (!params.productId) return null;
      const Product = require("../models/Product");
      const product = await Product.findById(params.productId).select("stockQuantity stockStatus").lean();
      return product;
    },
  },
  "products.related": {
    label: "Produits similaires (même catégorie)",
    resolve: async (storeId, params = {}) => {
      if (!params.productId) return [];
      const Product = require("../models/Product");
      const current = await Product.findById(params.productId).select("productCategory").lean();
      if (!current) return [];
      return Product.find({
        storeId,
        _id: { $ne: params.productId },
        productCategory: current.productCategory,
      }).limit(params.limit || 4).lean();
    },
  },
  "testimonials.latest": {
    label: "Derniers témoignages",
    resolve: async (storeId, params = {}) => {
      const Testimonial = require("../models/Testimonial");
      const { Types: { ObjectId } } = require("mongoose");
      return Testimonial.find({ storeId: ObjectId.isValid(storeId) ? new ObjectId(storeId) : storeId, isApproved: true })
        .sort({ createdAt: -1 })
        .limit(params.limit || 6)
        .lean();
    },
  },
  "testimonials.featured": {
    label: "Témoignages en vedette",
    resolve: async (storeId, params = {}) => {
      const Testimonial = require("../models/Testimonial");
      const { Types: { ObjectId } } = require("mongoose");
      return Testimonial.find({ storeId: ObjectId.isValid(storeId) ? new ObjectId(storeId) : storeId, isApproved: true, isFeatured: true })
        .sort({ rating: -1, createdAt: -1 })
        .limit(params.limit || 6)
        .lean();
    },
  },
  "testimonials.byRating": {
    label: "Témoignages par note",
    resolve: async (storeId, params = {}) => {
      const Testimonial = require("../models/Testimonial");
      const { Types: { ObjectId } } = require("mongoose");
      const minRating = Number(params.minRating) || 4;
      return Testimonial.find({ storeId: ObjectId.isValid(storeId) ? new ObjectId(storeId) : storeId, isApproved: true, rating: { $gte: minRating } })
        .sort({ createdAt: -1 })
        .limit(params.limit || 10)
        .lean();
    },
  },
  "testimonials.random": {
    label: "Témoignages aléatoires",
    resolve: async (storeId, params = {}) => {
      const Testimonial = require("../models/Testimonial");
      const { Types: { ObjectId } } = require("mongoose");
      return Testimonial.aggregate([
        { $match: { storeId: ObjectId.isValid(storeId) ? new ObjectId(storeId) : storeId, isApproved: true } },
        { $sample: { size: params.limit || 6 } },
      ]);
    },
  },
  "gallery.latest": {
    label: "Dernières galeries",
    resolve: async (storeId, params = {}) => {
      const Gallery = require("../models/Gallery");
      const limit = Number(params.limit) || 8;
      return Gallery.find({ storeId: new (require("mongoose").Schema.Types.ObjectId)(storeId), isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    },
  },
  "gallery.featured": {
    label: "Galeries en vedette",
    resolve: async (storeId, params = {}) => {
      const Gallery = require("../models/Gallery");
      const limit = Number(params.limit) || 8;
      return Gallery.find({ storeId: new (require("mongoose").Schema.Types.ObjectId)(storeId), isActive: true, "settings.isFeatured": true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    },
  },
  "gallery.byCategory": {
    label: "galeries par catégorie",
    resolve: async (storeId, params = {}) => {
      const Gallery = require("../models/Gallery");
      if (!params.category) return [];
      const limit = Number(params.limit) || 8;
      return Gallery.find({
        storeId: new (require("mongoose").Schema.Types.ObjectId)(storeId),
        isActive: true,
        category: params.category,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    },
  },
};
