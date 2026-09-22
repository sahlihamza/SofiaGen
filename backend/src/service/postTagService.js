const PostTag = require("../models/PostTag");
const Post = require("../models/Post");

const { generateUniqueSlug } = require("../utils/slugify");
const { getActiveStoreId } = require("../utils/getActiveStore");

const SORT_OPTIONS = {
  name_asc: { name: 1 },
  name_desc: { name: -1 },
  date_asc: { createdAt: 1 },
  date_desc: { createdAt: -1 },
};

class PostTagService {
  async getAllTags({ search, page, limit, sort, storeId } = {}) {
    const finalStoreId = storeId || await getActiveStoreId();
    const queryObject = { storeId: finalStoreId };

    if (search) {
      queryObject.name = { $regex: search, $options: "i" };
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 0;
    const skip = limits ? (pages - 1) * limits : 0;
    const sortObject = SORT_OPTIONS[sort] || { name: 1 };

    const totalDoc = await PostTag.countDocuments(queryObject);
    let query = PostTag.find(queryObject).sort(sortObject).skip(skip);
    if (limits) query = query.limit(limits);
    const tags = await query;

    return { tags, totalDoc, limits, pages };
  }

  async getTagById(id) {
    return await PostTag.findById(id);
  }

  async addTag(data, storeIdParam) {
    const storeId = storeIdParam || await getActiveStoreId();
    const slug = await generateUniqueSlug(PostTag, storeId, data.slug || data.name);

    const tag = new PostTag({
      storeId,
      name: data.name,
      slug,
      color: data.color,
    });

    return await tag.save();
  }

  async updateTag(id, data) {
    const current = await PostTag.findById(id);
    if (!current) return null;

    const updates = { color: data.color };
    if (data.name) updates.name = data.name;

    if (data.name && data.name !== current.name) {
      updates.slug = await generateUniqueSlug(PostTag, current.storeId, data.slug || data.name, id);
    }

    return await PostTag.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
  }

  async deleteTag(id) {
    await Post.updateMany({ tags: id }, { $pull: { tags: id } });
    return await PostTag.findByIdAndDelete(id);
  }

  async deleteManyTags(ids) {
    await Post.updateMany({ tags: { $in: ids } }, { $pullAll: { tags: ids } });
    return await PostTag.deleteMany({ _id: { $in: ids } });
  }

  async recountPostsForTag(tagId) {
    const count = await Post.countDocuments({ tags: tagId });
    await PostTag.findByIdAndUpdate(tagId, { postCount: count });
    return count;
  }
}

module.exports = new PostTagService();
