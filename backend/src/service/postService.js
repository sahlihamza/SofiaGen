const Post = require("../models/Post");
const PostCategory = require("../models/PostCategory");
const PostTag = require("../models/PostTag");
const { generateUniqueSlug } = require("../utils/slugify");
const { normalizeImagePath } = require("../utils/normalizeImagePath");
const { getActiveStoreId } = require("../utils/getActiveStore");

const WORDS_PER_MINUTE = 200;

// Strips HTML tags before counting words so readingTime reflects the actual
// text, not markup  content is stored as HTML (see draft-js-to-html on the
// frontend), so a naive whitespace split would overcount closing/opening tags.
const calculateReadingTime = (html) => {
  const text = String(html || "").replace(/<[^>]*>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
};

class PostService {
  async getAllPosts({
    storeId,
    search,
    status,
    category,
    tag,
    author,
    featured,
    sticky,
    dateFrom,
    dateTo,
    page,
    limit,
    sort,
  } = {}) {
    const finalStoreId = storeId || await getActiveStoreId();
    const queryObject = { storeId: finalStoreId };

    if (search) {
      queryObject.title = { $regex: search, $options: "i" };
    }
    if (status) queryObject.status = status;
    if (category) queryObject.categories = category;
    if (tag) queryObject.tags = tag;
    if (author) queryObject.authorId = author;
    if (featured !== undefined) queryObject.featured = featured === "true";
    if (sticky !== undefined) queryObject.sticky = sticky === "true";
    if (dateFrom || dateTo) {
      queryObject.createdAt = {};
      if (dateFrom) queryObject.createdAt.$gte = new Date(dateFrom);
      if (dateTo) queryObject.createdAt.$lte = new Date(dateTo);
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;

    const sortObject = sort === "title_asc" ? { title: 1 } : { sticky: -1, createdAt: -1 };

    const totalDoc = await Post.countDocuments(queryObject);
    const posts = await Post.find(queryObject)
      .populate("authorId", "name email")
      .populate("categories", "name slug")
      .populate("tags", "name slug color")
      .sort(sortObject)
      .skip(skip)
      .limit(limits);

    return { posts, totalDoc, limits, pages };
  }

  async getPostById(id) {
    return await Post.findById(id)
      .populate("authorId", "name email")
      .populate("categories", "name slug")
      .populate("tags", "name slug color");
  }

  async addPost(data, authorId, storeIdParam) {
    const storeId = storeIdParam || await getActiveStoreId();
    const slug = await generateUniqueSlug(Post, storeId, data.slug || data.title);
    const status = data.status || "draft";

    const post = new Post({
      storeId,
      authorId,
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      featuredImage: normalizeImagePath(data.featuredImage),
      gallery: (data.gallery || []).map(normalizeImagePath),
      status,
      visibility: data.visibility || "public",
      password: data.visibility === "password" ? data.password : undefined,
      scheduledAt: data.scheduledAt || undefined,
      allowComments: data.allowComments ?? true,
      featured: data.featured ?? false,
      sticky: data.sticky ?? false,
      categories: data.categories || [],
      tags: data.tags || [],
      seo: data.seo || {},
      readingTime: calculateReadingTime(data.content),
      publishedAt: status === "published" ? new Date() : undefined,
    });

    const saved = await post.save();
    await this.syncCounts(saved.categories, saved.tags);
    return saved;
  }

  async updatePost(id, data) {
    const current = await Post.findById(id);
    if (!current) return null;

    const updates = {
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      featuredImage: normalizeImagePath(data.featuredImage),
      visibility: data.visibility,
      scheduledAt: data.scheduledAt,
      allowComments: data.allowComments,
      featured: data.featured,
      sticky: data.sticky,
      seo: data.seo,
    };

    if (data.gallery !== undefined) updates.gallery = data.gallery.map(normalizeImagePath);
    if (data.categories !== undefined) updates.categories = data.categories;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.content !== undefined) updates.readingTime = calculateReadingTime(data.content);
    if (data.visibility === "password" && data.password) updates.password = data.password;

    if (data.title && data.title !== current.title) {
      updates.slug = await generateUniqueSlug(Post, current.storeId, data.slug || data.title, id);
    }

    if (data.status && data.status !== current.status) {
      updates.status = data.status;
      if (data.status === "published" && !current.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    const updated = await Post.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    // Recompute counts for every category/tag that was attached either before
    // or after the update (the union covers both "added to" and "removed from").
    await this.syncCounts(
      [...current.categories, ...(updated.categories || [])],
      [...current.tags, ...(updated.tags || [])]
    );

    return updated;
  }

  async deletePost(id) {
    const post = await Post.findByIdAndDelete(id);
    if (post) await this.syncCounts(post.categories, post.tags);
    return post;
  }

  async deleteManyPosts(ids) {
    const posts = await Post.find({ _id: { $in: ids } });
    const result = await Post.deleteMany({ _id: { $in: ids } });
    const categoryIds = posts.flatMap((p) => p.categories);
    const tagIds = posts.flatMap((p) => p.tags);
    await this.syncCounts(categoryIds, tagIds);
    return result;
  }

  async setStatus(id, status) {
    const updates = { status };
    if (status === "published") {
      const current = await Post.findById(id);
      if (current && !current.publishedAt) updates.publishedAt = new Date();
    }
    return await Post.findByIdAndUpdate(id, updates, { new: true });
  }

  async setStatusMany(ids, status) {
    return await Post.updateMany(
      { _id: { $in: ids } },
      { $set: { status, ...(status === "published" ? { publishedAt: new Date() } : {}) } }
    );
  }

  async duplicatePost(id) {
    const original = await Post.findById(id);
    if (!original) return null;

    const slug = await generateUniqueSlug(original.constructor, original.storeId, `${original.title}-copy`);

    const copy = new Post({
      storeId: original.storeId,
      authorId: original.authorId,
      title: `${original.title} (copie)`,
      slug,
      excerpt: original.excerpt,
      content: original.content,
      featuredImage: original.featuredImage,
      gallery: original.gallery,
      status: "draft",
      visibility: original.visibility,
      allowComments: original.allowComments,
      featured: false,
      sticky: false,
      categories: original.categories,
      tags: original.tags,
      seo: original.seo,
      readingTime: original.readingTime,
    });

    const saved = await copy.save();
    await this.syncCounts(saved.categories, saved.tags);
    return saved;
  }

  async bulkChangeCategory(ids, categoryId) {
    const posts = await Post.find({ _id: { $in: ids } });
    const previousCategoryIds = posts.flatMap((p) => p.categories);
    await Post.updateMany({ _id: { $in: ids } }, { $set: { categories: [categoryId] } });
    await this.syncCounts([...previousCategoryIds, categoryId], []);
  }

  async bulkAddTag(ids, tagId) {
    await Post.updateMany({ _id: { $in: ids } }, { $addToSet: { tags: tagId } });
    await this.syncCounts([], [tagId]);
  }

  // Recomputes postCount on every affected category/tag after a mutation 
  // simpler and always-correct vs. incremental +1/-1 bookkeeping scattered
  // across every mutation path.
  async syncCounts(categoryIds = [], tagIds = []) {
    const uniqueCategoryIds = [...new Set(categoryIds.map(String))];
    const uniqueTagIds = [...new Set(tagIds.map(String))];

    await Promise.all([
      ...uniqueCategoryIds.map(async (categoryId) => {
        const count = await Post.countDocuments({ categories: categoryId });
        await PostCategory.findByIdAndUpdate(categoryId, { postCount: count });
      }),
      ...uniqueTagIds.map(async (tagId) => {
        const count = await Post.countDocuments({ tags: tagId });
        await PostTag.findByIdAndUpdate(tagId, { postCount: count });
      }),
    ]);
  }
}

const service = new PostService();
service.calculateReadingTime = calculateReadingTime;

module.exports = service;
