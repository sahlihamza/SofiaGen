const PostCategory = require("../models/PostCategory");
const Post = require("../models/Post");

const { generateUniqueSlug } = require("../utils/slugify");
const { normalizeImagePath } = require("../utils/normalizeImagePath");
const { getActiveStoreId } = require("../utils/getActiveStore");

// Flat storage (parentId ref), tree reconstructed in app code at read-time 
// same principle as Category.js's readyToParentAndChildrenCategory, but with
// a proper ObjectId parentId instead of a loosely-typed string.
const buildCategoryTree = (categories, parentId = null) => {
  const parentKey = parentId ? String(parentId) : null;
  return categories
    .filter((cat) => (cat.parentId ? String(cat.parentId) : null) === parentKey)
    .map((cat) => ({
      ...(cat.toObject ? cat.toObject() : cat),
      children: buildCategoryTree(categories, cat._id),
    }));
};

class PostCategoryService {
  async getAllCategories({ search, page, limit, storeId } = {}) {
    const finalStoreId = storeId || await getActiveStoreId();
    const queryObject = { storeId: finalStoreId };

    if (search) {
      queryObject.name = { $regex: search, $options: "i" };
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 0;
    const skip = limits ? (pages - 1) * limits : 0;

    const totalDoc = await PostCategory.countDocuments(queryObject);
    let query = PostCategory.find(queryObject).sort({ name: 1 }).skip(skip);
    if (limits) query = query.limit(limits);
    const categories = await query;

    return { categories, totalDoc, limits, pages };
  }

  async getCategoryTree(storeId) {
    const finalStoreId = storeId || await getActiveStoreId();
    const categories = await PostCategory.find({ storeId: finalStoreId }).sort({ name: 1 });
    return buildCategoryTree(categories);
  }

  async getCategoryById(id) {
    return await PostCategory.findById(id);
  }

  async addCategory(data, storeIdParam) {
    const storeId = storeIdParam || await getActiveStoreId();
    const slug = await generateUniqueSlug(PostCategory, storeId, data.slug || data.name);

    const category = new PostCategory({
      storeId,
      name: data.name,
      slug,
      description: data.description,
      parentId: data.parentId || null,
      image: normalizeImagePath(data.image),
    });

    return await category.save();
  }

  async updateCategory(id, data) {
    const current = await PostCategory.findById(id);
    if (!current) return null;

    const updates = {
      name: data.name,
      description: data.description,
      parentId: data.parentId || null,
      image: normalizeImagePath(data.image),
    };

    if (data.name && data.name !== current.name) {
      updates.slug = await generateUniqueSlug(PostCategory, current.storeId, data.slug || data.name, id);
    }

    return await PostCategory.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async deleteCategory(id) {
    // Orphan (not cascade-delete) children and detach the category from any
    // posts referencing it  mirrors Category.js's one-level orphaning, but
    // explicit about detaching posts so search/filter never shows a dangling ref.
    await PostCategory.updateMany({ parentId: id }, { parentId: null });
    await Post.updateMany({ categories: id }, { $pull: { categories: id } });
    return await PostCategory.findByIdAndDelete(id);
  }

  async deleteManyCategories(ids) {
    await PostCategory.updateMany({ parentId: { $in: ids } }, { parentId: null });
    await Post.updateMany({ categories: { $in: ids } }, { $pullAll: { categories: ids } });
    return await PostCategory.deleteMany({ _id: { $in: ids } });
  }

  async recountPostsForCategory(categoryId) {
    const count = await Post.countDocuments({ categories: categoryId });
    await PostCategory.findByIdAndUpdate(categoryId, { postCount: count });
    return count;
  }
}

module.exports = new PostCategoryService();
module.exports.buildCategoryTree = buildCategoryTree;
