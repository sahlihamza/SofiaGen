const fs = require("fs");
const path = require("path");
const ProductReview = require("../models/ProductReview");
const ProductReviewReply = require("../models/ProductReviewReply");
const ReviewImage = require("../models/ReviewImage");
const ReviewVote = require("../models/ReviewVote");
const ReviewReport = require("../models/ReviewReport");
const Notification = require("../models/Notification");
const Product = require("../models/Product");
const Store = require("../models/Store");

const { normalizeImagePath } = require("../utils/normalizeImagePath");
const { getActiveStoreId } = require("../utils/getActiveStore");
const notificationService = require("./notificationService");

// Best-effort removal of the physical file under public/  a missing file
// (already cleaned up, seeded data) must never fail the DB operation.
const unlinkMediaFile = async (relativeUrl) => {
  if (!relativeUrl) return;
  const filePath = path.join(process.cwd(), "public", relativeUrl);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const SORT_OPTIONS = {
  date_asc: { createdAt: 1 },
  date_desc: { createdAt: -1 },
  rating_asc: { rating: 1 },
  rating_desc: { rating: -1 },
};

const DEFAULT_REVIEW_SETTINGS = {
  enabled: true,
  requireApproval: true,
  verifiedOwnersOnly: false,
  allowGuestReviews: false,
  showRating: true,
  showCount: true,
  maxImages: 5,
};

class ProductReviewService {
  // `storeId` optional  pass it when the caller already resolved the active
  // store to avoid a second lookup (addReview does this).
  async getSettings(storeId) {
    const id = storeId;
    const store = await Store.findById(id, "reviewSettings");
    return { ...DEFAULT_REVIEW_SETTINGS, ...(store?.reviewSettings?.toObject?.() || store?.reviewSettings || {}) };
  }

  async updateSettings(data, storeIdParam) {
    const storeId = storeIdParam || await getActiveStoreId();
    const current = await this.getSettings(storeId);

    const next = {
      enabled: data.enabled ?? current.enabled,
      requireApproval: data.requireApproval ?? current.requireApproval,
      verifiedOwnersOnly: data.verifiedOwnersOnly ?? current.verifiedOwnersOnly,
      allowGuestReviews: data.allowGuestReviews ?? current.allowGuestReviews,
      showRating: data.showRating ?? current.showRating,
      showCount: data.showCount ?? current.showCount,
      maxImages: data.maxImages ?? current.maxImages,
    };

    await Store.findByIdAndUpdate(storeId, { reviewSettings: next });
    return next;
  }

  async getAllReviews({
    product,
    status,
    rating,
    verifiedPurchase,
    search,
    page,
    limit,
    sort,
    storeId,
  } = {}) {
    const finalStoreId = storeId || await getActiveStoreId();
    const queryObject = { storeId: finalStoreId };

    if (product) queryObject.productId = product;
    if (status) queryObject.status = status;
    if (rating) queryObject.rating = Number(rating);
    if (verifiedPurchase !== undefined && verifiedPurchase !== "") {
      queryObject.verifiedPurchase = verifiedPurchase === "true" || verifiedPurchase === true;
    }
    if (search) {
      queryObject.$or = [
        { reviewerName: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    const pages = Number(page) || 1;
    const limits = Number(limit) || 20;
    const skip = (pages - 1) * limits;
    const sortObject = SORT_OPTIONS[sort] || { createdAt: -1 };

    const totalDoc = await ProductReview.countDocuments(queryObject);
    const reviews = await ProductReview.find(queryObject)
      .populate("productId", "productName")
      .populate({ path: "reply", populate: { path: "userId", select: "name" } })
      .populate("media")
      .sort(sortObject)
      .skip(skip)
      .limit(limits);

    return { reviews, totalDoc, limits, pages };
  }

  async getReviewById(id) {
    return await ProductReview.findById(id)
      .populate("productId", "productName")
      .populate({ path: "reply", populate: { path: "userId", select: "name" } })
      .populate("media");
  }

  // Public storefront summary for a product: rating stats, star distribution
  // and the list of approved reviews (with their store reply + media). Used
  // by the public reviews page (SEO/JSON-LD) and available for a future
  // storefront to consume as JSON.
  async getPublicSummary(productId) {
    const product = await Product.findById(productId, "productName status enableReviews storeId rating");
    if (!product || product.status !== "published") return null;

    const settings = await this.getSettings(product.storeId);

    const reviews = await ProductReview.find({ productId, status: "approved" })
      .populate({ path: "reply", populate: { path: "userId", select: "name" } })
      .populate("media")
      .sort({ createdAt: -1 });

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });
    const count = reviews.length;
    const distributionPct = Object.fromEntries(
      Object.entries(distribution).map(([star, n]) => [star, count ? Math.round((n / count) * 100) : 0])
    );

    return {
      product: { _id: product._id, name: product.productName },
      rating: product.rating || { average: 0, count: 0 },
      distribution,
      distributionPct,
      settings,
      reviews,
    };
  }

  // Mirrors WooCommerce's review creation gate: the product must exist, be
  // published, and have reviews enabled  otherwise the store owner never
  // opted into moderating this product's reviews at all.
  async addReview(storeId, data) {
    const settings = await this.getSettings(storeId);

    const product = await Product.findById(data.productId);
    if (!product) {
      const error = new Error("Produit introuvable");
      error.code = "PRODUCT_NOT_FOUND";
      throw error;
    }
    if (product.status !== "published") {
      const error = new Error("Ce produit n'est pas publié");
      error.code = "PRODUCT_NOT_PUBLISHED";
      throw error;
    }
    if (!product.enableReviews) {
      const error = new Error("Les avis ne sont pas activés pour ce produit");
      error.code = "REVIEWS_DISABLED";
      throw error;
    }
    if (!settings.enabled) {
      const error = new Error("Les avis sont désactivés pour cette boutique");
      error.code = "REVIEWS_DISABLED";
      throw error;
    }
    if (!data.customerId && !settings.allowGuestReviews) {
      const error = new Error("Un compte client est requis pour laisser un avis");
      error.code = "GUEST_REVIEWS_DISABLED";
      throw error;
    }
    if (settings.verifiedOwnersOnly && !data.verifiedPurchase) {
      const error = new Error("Seuls les acheteurs vérifiés peuvent laisser un avis");
      error.code = "VERIFIED_OWNERS_ONLY";
      throw error;
    }

    const media = settings.maxImages
      ? (data.media || []).slice(0, settings.maxImages)
      : data.media;

    const review = new ProductReview({
      storeId,
      productId: data.productId,
      customerId: data.customerId || null,
      orderId: data.orderId || null,
      rating: data.rating,
      reviewerName: data.reviewerName,
      reviewerEmail: data.reviewerEmail,
      title: data.title,
      comment: data.comment,
      // requireApproval=false auto-publishes; an explicit data.status (admin
      // creating a review directly) still wins over the store default.
      status: data.status || (settings.requireApproval ? "pending" : "approved"),
      verifiedPurchase: data.verifiedPurchase ?? false,
      isFeatured: data.isFeatured ?? false,
    });

    const saved = await review.save();

    if (Array.isArray(media) && media.length > 0) {
      await this.setReviewMedia(saved._id, media);
    }

    await this.recalculateRating(saved.productId);

    await Notification.create({
      productId: saved.productId,
      reviewId: saved._id,
      message: `Nouvel avis reçu pour ${product.productName}`,
    });

    emitEvent("review.created", {
      storeId,
      entityId: saved._id,
      metadata: { productName: product.productName },
      actionUrl: `/product-reviews`,
    });

    return saved;
  }

  // Replace the full media set of a review. Items are { url|path, type },
  // position derived from array order; stored paths are always relative.
  async setReviewMedia(reviewId, items = []) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;

    const previous = await ReviewImage.find({ reviewId });
    await ReviewImage.deleteMany({ reviewId });

    const docs = (items || [])
      .map((item, index) => ({
        storeId: review.storeId,
        reviewId,
        url: normalizeImagePath(typeof item === "string" ? item : item.path || item.url),
        type: item.type === "video" ? "video" : "image",
        position: index,
      }))
      .filter((doc) => doc.url);

    const created = docs.length ? await ReviewImage.insertMany(docs) : [];

    // Remove files that are no longer referenced by the new set.
    const keptUrls = new Set(docs.map((doc) => doc.url));
    await Promise.all(
      previous.filter((m) => !keptUrls.has(m.url)).map((m) => unlinkMediaFile(m.url))
    );

    return created;
  }

  async deleteMediaItem(mediaId) {
    const media = await ReviewImage.findByIdAndDelete(mediaId);
    if (media) await unlinkMediaFile(media.url);
    return media;
  }

  // Ticket rule: media are deleted automatically when their review goes away.
  async deleteMediaForReviews(reviewIds) {
    const media = await ReviewImage.find({ reviewId: { $in: reviewIds } });
    await ReviewImage.deleteMany({ reviewId: { $in: reviewIds } });
    await Promise.all(media.map((m) => unlinkMediaFile(m.url)));
  }

  async updateReview(id, data) {
    const current = await ProductReview.findById(id);
    if (!current) return null;

    const updates = {
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      isFeatured: data.isFeatured,
    };
    if (data.status !== undefined) updates.status = data.status;

    const updated = await ProductReview.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    await this.recalculateRating(updated.productId);
    return updated;
  }

  async setStatus(id, status) {
    const updated = await ProductReview.findByIdAndUpdate(id, { status }, { new: true });
    if (updated) {
      await this.recalculateRating(updated.productId);
      if (status === "approved") {
        await this.notifyReviewApproved(updated);
        emitEvent("review.approved", { storeId: updated.storeId, entityId: updated._id });
      } else if (status === "rejected") {
        emitEvent("review.rejected", { storeId: updated.storeId, entityId: updated._id });
      }
    }
    return updated;
  }

  async setStatusMany(ids, status) {
    const reviews = await ProductReview.find({ _id: { $in: ids } });
    await ProductReview.updateMany({ _id: { $in: ids } }, { $set: { status } });
    const productIds = [...new Set(reviews.map((r) => String(r.productId)))];
    await Promise.all(productIds.map((productId) => this.recalculateRating(productId)));
    if (status === "approved") {
      await Promise.all(reviews.map((review) => this.notifyReviewApproved(review)));
    }
  }

  async notifyReviewApproved(review) {
    if (!review.customerId) return;
    await Notification.create({
      customerId: review.customerId,
      productId: review.productId,
      reviewId: review._id,
      message: "Votre avis a t approuvé",
    });

    const product = await Product.findById(review.productId).select("productName").lean();
    await notificationService
      .notify({
        event: "customer.review_approved",
        storeId: review.storeId,
        entityId: review._id,
        recipients: [review.customerId],
        recipientModel: "Customer",
        category: "reviews",
        metadata: { productName: product?.productName || "" },
        actionUrl: `/product/${review.productId}`,
      })
      .catch(() => {});
  }

  async deleteReview(id) {
    const review = await ProductReview.findByIdAndDelete(id);
    if (review) {
      await ProductReviewReply.deleteOne({ reviewId: id });
      await ReviewVote.deleteMany({ reviewId: id });
      await ReviewReport.deleteMany({ reviewId: id });
      await this.deleteMediaForReviews([id]);
      await this.recalculateRating(review.productId);
    }
    return review;
  }

  async deleteManyReviews(ids) {
    const reviews = await ProductReview.find({ _id: { $in: ids } });
    const result = await ProductReview.deleteMany({ _id: { $in: ids } });
    await ProductReviewReply.deleteMany({ reviewId: { $in: ids } });
    await ReviewVote.deleteMany({ reviewId: { $in: ids } });
    await ReviewReport.deleteMany({ reviewId: { $in: ids } });
    await this.deleteMediaForReviews(ids);
    const productIds = [...new Set(reviews.map((r) => String(r.productId)))];
    await Promise.all(productIds.map((productId) => this.recalculateRating(productId)));
    return result;
  }

  // Create-or-update: WooCommerce keeps a single public store reply per
  // review, so replying again edits the existing message in place.
  async setReply(reviewId, userId, message) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;

    const reply = await ProductReviewReply.findOneAndUpdate(
      { reviewId },
      { storeId: review.storeId, reviewId, userId, message },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate("userId", "name");

    if (review.customerId) {
      await Notification.create({
        customerId: review.customerId,
        productId: review.productId,
        reviewId: review._id,
        message: "La boutique a répondu à votre avis",
      });
    }

    return reply;
  }

  async deleteReply(reviewId) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;
    await ProductReviewReply.deleteOne({ reviewId });
    return review;
  }

  // One vote per voter (unique reviewId+voterKey index): voting the same way
  // again removes the vote (toggle off), voting the other way switches it.
  async castVote(reviewId, { voterKey, vote, customerId }) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;

    const existing = await ReviewVote.findOne({ reviewId, voterKey });

    if (existing && existing.vote === vote) {
      await ReviewVote.deleteOne({ _id: existing._id });
    } else if (existing) {
      existing.vote = vote;
      await existing.save();
    } else {
      await ReviewVote.create({
        storeId: review.storeId,
        reviewId,
        voterKey,
        customerId: customerId || null,
        vote,
      });
    }

    return await this.recountVotes(reviewId);
  }

  async recountVotes(reviewId) {
    const [helpfulCount, notHelpfulCount] = await Promise.all([
      ReviewVote.countDocuments({ reviewId, vote: "up" }),
      ReviewVote.countDocuments({ reviewId, vote: "down" }),
    ]);

    await ProductReview.findByIdAndUpdate(reviewId, { helpfulCount, notHelpfulCount });
    return { helpfulCount, notHelpfulCount };
  }

  // One report per reporter (unique reviewId+reporterKey index): reporting
  // again just updates the reason/comment instead of stacking duplicates.
  async reportReview(reviewId, { reporterKey, reason, comment, customerId }) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;

    await ReviewReport.findOneAndUpdate(
      { reviewId, reporterKey },
      {
        storeId: review.storeId,
        reviewId,
        reporterKey,
        customerId: customerId || null,
        reason,
        comment,
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return await this.recountReports(reviewId);
  }

  async recountReports(reviewId) {
    const reportCount = await ReviewReport.countDocuments({ reviewId });
    await ProductReview.findByIdAndUpdate(reviewId, { reportCount });
    return { reportCount };
  }

  async getReports(reviewId) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;
    return await ReviewReport.find({ reviewId }).sort({ createdAt: -1 });
  }

  // Moderation decision "nothing wrong here": clear every report and reset
  // the flag counter.
  async clearReports(reviewId) {
    const review = await ProductReview.findById(reviewId);
    if (!review) return null;
    await ReviewReport.deleteMany({ reviewId });
    await ProductReview.findByIdAndUpdate(reviewId, { reportCount: 0 });
    return review;
  }

  // Only approved reviews count toward the product's public rating 
  // pending/rejected/spam reviews must not skew what shoppers see.
  async recalculateRating(productId) {
    const approved = await ProductReview.find({ productId, status: "approved" }, "rating");
    const count = approved.length;
    const average = count ? approved.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: { average: Math.round(average * 10) / 10, count },
    });

    return { average, count };
  }
}

module.exports = new ProductReviewService();
