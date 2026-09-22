const Store = require("../models/Store");
const User = require("../models/User");
const UserStore = require("../models/UserStore");
const Role = require("../models/Role");
const StoreDomain = require("../models/StoreDomain");
const GeneralSettings = require("../models/GeneralSettings");
const ProductSettings = require("../models/ProductSettings");
const ShippingZone = require("../models/ShippingZone");
const ShippingClass = require("../models/ShippingClass");
const ShippingSettings = require("../models/ShippingSettings");
const PickupLocation = require("../models/PickupLocation");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const ProductReview = require("../models/ProductReview");
const Coupon = require("../models/Coupon");
const Subscription = require("../models/Subscription");
const Backup = require("../models/Backup");
const Post = require("../models/Post");
const PostCategory = require("../models/PostCategory");
const PostTag = require("../models/PostTag");
const PostComment = require("../models/PostComment");
const Gallery = require("../models/Gallery");
const ProductCategory = require("../models/ProductCategory");
const StockMovement = require("../models/StockMovement");
const Brand = require("../models/Brand");
const Attribute = require("../models/Attribute");
const Menu = require("../models/Menu");
const FormSubmission = require("../models/FormSubmission");
const SavedBlock = require("../models/SavedBlock.model");
const StoreUsage = require("../models/StoreUsage");
const Theme = require("../models/Theme");
const Page = require("../models/Page");
const GlobalComponent = require("../models/GlobalComponent");
const logger = require("../config/logger");

// SO-14: Order, Invoice and AuditLog are deliberately NOT in this list.
// Financial and audit records must not be purged blindly along with
// disposable store content (catalog, settings, themes...)  the retention
// policy here is soft-delete -> retention window -> anonymize (Order) or
// keep indefinitely (Invoice, AuditLog) per legal/accounting requirements,
// not "delete everything after N days" like the rest of this list. See
// anonymizeStoreOrders below, called from purgeStore instead of a delete.
const STORE_SCOPED_MODELS = [
  { model: Product, name: "Product" },
  { model: Customer, name: "Customer" },
  { model: ProductReview, name: "ProductReview" },
  { model: Coupon, name: "Coupon" },
  { model: Subscription, name: "Subscription" },
  { model: StoreDomain, name: "StoreDomain" },
  { model: Backup, name: "Backup" },
  { model: Post, name: "Post" },
  { model: PostCategory, name: "PostCategory" },
  { model: PostTag, name: "PostTag" },
  { model: PostComment, name: "PostComment" },
  { model: Gallery, name: "Gallery" },
  { model: ProductCategory, name: "ProductCategory" },
  { model: StockMovement, name: "StockMovement" },
  { model: Brand, name: "Brand" },
  { model: Attribute, name: "Attribute" },
  { model: Menu, name: "Menu" },
  { model: FormSubmission, name: "FormSubmission" },
  { model: SavedBlock, name: "SavedBlock" },
  { model: StoreUsage, name: "StoreUsage" },
  { model: Theme, name: "Theme" },
  { model: Page, name: "Page" },
  { model: GlobalComponent, name: "GlobalComponent" },
];

// SO-14: Order records are accounting/legal data  never deleted outright.
// Once the retention window has passed, only the customer-identifying
// fields are stripped (name/email/phone/company/address); everything an
// accountant needs later (amounts, dates, tax, city/state/country/zipCode
// for jurisdiction) is left intact. Already-anonymized orders are skipped.
const stripPII = (info) => {
  if (!info) return info;
  return {
    ...info,
    name: "",
    email: "",
    contact: "",
    phone: "",
    company: "",
    address: "",
  };
};

async function anonymizeStoreOrders(storeId) {
  const orders = await Order.find({ storeId, anonymizedAt: null });
  let count = 0;
  for (const order of orders) {
    order.user_info = stripPII(order.user_info);
    order.billing_info = stripPII(order.billing_info);
    order.anonymizedAt = new Date();
    await order.save();
    count += 1;
  }
  return count;
}

async function purgeStore(storeId) {
  const results = { deleted: [], errors: [] };

  try {
    const anonymized = await anonymizeStoreOrders(storeId);
    results.deleted.push({ model: "Order", count: `${anonymized} anonymized (not deleted  see SO-14)` });
  } catch (err) {
    results.errors.push({ model: "Order", error: err.message });
    logger.error(`purgeStore: failed to anonymize orders for store ${storeId}:`, err.message);
  }

  for (const { model, name } of STORE_SCOPED_MODELS) {
    try {
      const result = await model.deleteMany({ storeId });
      results.deleted.push({ model: name, count: result.deletedCount });
    } catch (err) {
      results.errors.push({ model: name, error: err.message });
      logger.error(`purgeStore: failed to delete ${name} for store ${storeId}:`, err.message);
    }
  }

  try {
    await UserStore.deleteMany({ storeId });
    results.deleted.push({ model: "UserStore", count: "all" });
  } catch (err) {
    results.errors.push({ model: "UserStore", error: err.message });
  }

  try {
    const storeRoles = await Role.find({ storeId });
    for (const role of storeRoles) {
      await User.updateMany(
        { role: role._id },
        { $pull: { role: role._id } }
      );
    }
    await Role.deleteMany({ storeId });
    results.deleted.push({ model: "Role", count: storeRoles.length });
  } catch (err) {
    results.errors.push({ model: "Role", error: err.message });
  }

  try {
    await User.updateMany(
      { currentStoreId: storeId },
      { $unset: { currentStoreId: "" } }
    );
    results.deleted.push({ model: "User.currentStoreId", count: "updated" });
  } catch (err) {
    results.errors.push({ model: "User.currentStoreId", error: err.message });
  }

  try {
    await GeneralSettings.deleteOne({ storeId });
    results.deleted.push({ model: "GeneralSettings", count: 1 });
  } catch (err) {
    results.errors.push({ model: "GeneralSettings", error: err.message });
  }

  try {
    await ProductSettings.deleteOne({ storeId });
    results.deleted.push({ model: "ProductSettings", count: 1 });
  } catch (err) {
    results.errors.push({ model: "ProductSettings", error: err.message });
  }

  try {
    await ShippingZone.deleteMany({ storeId });
    results.deleted.push({ model: "ShippingZone", count: "all" });
  } catch (err) {
    results.errors.push({ model: "ShippingZone", error: err.message });
  }

  try {
    await ShippingClass.deleteMany({ storeId });
    results.deleted.push({ model: "ShippingClass", count: "all" });
  } catch (err) {
    results.errors.push({ model: "ShippingClass", error: err.message });
  }

  try {
    await ShippingSettings.deleteOne({ storeId });
    results.deleted.push({ model: "ShippingSettings", count: 1 });
  } catch (err) {
    results.errors.push({ model: "ShippingSettings", error: err.message });
  }

  try {
    await PickupLocation.deleteMany({ storeId });
    results.deleted.push({ model: "PickupLocation", count: "all" });
  } catch (err) {
    results.errors.push({ model: "PickupLocation", error: err.message });
  }

  try {
    await Store.findByIdAndDelete(storeId);
    results.deleted.push({ model: "Store", count: 1 });
  } catch (err) {
    results.errors.push({ model: "Store", error: err.message });
  }

  return results;
}

async function purgeExpiredStores(retentionDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const expiredStores = await Store.find({
    deletedAt: { $lte: cutoff, $ne: null },
    status: "deleted",
  }).select("_id name");

  const results = [];
  for (const store of expiredStores) {
    try {
      const purgeResult = await purgeStore(store._id);
      results.push({
        storeId: store._id,
        storeName: store.name,
        ...purgeResult,
      });
    } catch (err) {
      results.push({
        storeId: store._id,
        storeName: store.name,
        error: err.message,
      });
    }
  }

  return results;
}

const startStorePurgeJob = (intervalMs = 24 * 60 * 60 * 1000) => {
  const runSafely = async () => {
    try {
      const result = await purgeExpiredStores(30);
      const purgedCount = result.filter((r) => !r.error).length;
      const errorCount = result.filter((r) => r.error).length;
      logger.info(`storePurgeJob: processed ${result.length} stores, ${purgedCount} purged, ${errorCount} errors`);
    } catch (err) {
      logger.error("storePurgeJob failed:", err.message);
    }
  };

  runSafely();
  return setInterval(runSafely, intervalMs);
};

module.exports = {
  purgeStore,
  purgeExpiredStores,
  startStorePurgeJob,
  anonymizeStoreOrders,
};
