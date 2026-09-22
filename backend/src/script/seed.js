require("dotenv").config();
const { connectDB, withRetry } = require("../config/db");

const Admin = require("../models/User");
const adminData = require("../utils/admin");

const Role = require("../models/Role");
const RoleTemplate = require("../models/RoleTemplate");
const RoleTemplateService = require("../service/RoleTemplateService");
const roleData = require("../utils/roles");
const { DEFAULT_ROLES } = require("../config/rbac/roles");

const Permission = require("../models/Permission");

const Customer = require("../models/Customer");
const customerData = require("../utils/customers");

const Coupon = require("../models/Coupon");
const couponData = require("../utils/coupon");

const bcrypt = require("bcryptjs");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const UserStore = require("../models/UserStore");
const Plan = require("../models/Plan");

const Product = require("../models/Product");
const productData = require("../utils/products");

const Order = require("../models/Order");
const orderData = require("../utils/orders");

const Category = require("../models/Category");
const categoryData = require("../utils/categories");

const Currency = require("../models/Currency");
const currencyData = require("../utils/currency");

const Country = require("../models/Country");
const countryData = require("../utils/countries");

const Attribute = require("../models/Attribute");
const attributeData = require("../utils/attributes");

const AttributeValue = require("../models/AttributeValue");
const attributeValueData = require("../utils/attributeValues");

const Setting = require("../models/Setting");
const settingData = require("../utils/settings");

const PostCategory = require("../models/PostCategory");
const postCategoryData = require("../utils/postCategories");

const PostTag = require("../models/PostTag");
const postTagData = require("../utils/postTags");

const Post = require("../models/Post");
const postData = require("../utils/posts");

const PostComment = require("../models/PostComment");
const postCommentData = require("../utils/postComments");

const Invoice = require("../models/Invoice");

const Payment = require("../models/Payment");

const PaymentSettings = require("../models/PaymentSettings");
const paymentSettingsData = require("../utils/paymentSettings");


const CouponUsage = require("../models/CouponUsage");
const couponUsageData = require("../utils/couponUsages");

const Feature = require("../models/Feature");
const QuotaType = require("../models/QuotaType");
const PlatformCoupon = require("../models/PlatformCoupon");
const platformCouponData = require("../utils/platformCoupons");

const logger = require("../config/logger");

const seedPermissions = require("./seedPermissions");
const { seedSuperAdmin } = require("./seedSuperAdmin");
const { seedFeatures } = require("./seedFeatures");
const { seedFeatureGroups } = require("./seedFeatureGroups");
const { seedPlans } = require("./seedPlans");
const { seedQuotaTypes } = require("./seedQuotaTypes");
const { seedStoreSubscriptions } = require("./seedStoreSubscriptions");
const { seedInvoices } = require("../seeders/seedInvoices");
const { seedPlatformCoupons } = require("./seedPlatformCoupons");
const { seedPayments } = require("../seeders/seedPayments");
const migrateCustomers = require("./migrateCustomers");
const seedNotificationTemplates = require("./seedNotificationTemplates");

const bootstrapImport = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("Seed scripts cannot be run in production");
    process.exit(1);
  }
  await connectDB();
  await importData();
};

bootstrapImport().catch((error) => {
  logger.error("data import failed", error);
  process.exit(1);
});

const localized = (value) =>
  value && typeof value === "object" ? value.en : value;

const mapProduct = (p) => {
  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const stock = typeof p.stock === "number" ? p.stock : undefined;

  return {
    productName: localized(p.title) || localized(p.name),
    description: localized(p.description),
    productType: hasVariants ? "variable" : "simple",
    status: p.status === "show" ? "published" : "draft",
    regularPrice: p.prices?.originalPrice,
    salePrice: p.prices?.discount ? p.prices?.price : undefined,
    sku: p.sku || undefined,
    manageStock: stock !== undefined,
    stockQuantity: stock,
    stockStatus: stock === undefined || stock > 0 ? "instock" : "outofstock",
  };
};

const getPermissionIdsByActions = async (actions) => {
  const permissions = await Permission.find({ action: { $in: actions } });
  return permissions.map((p) => p._id);
};

const assignPermissionsToRole = async (roleName, actionFilters) => {
  const permissions = await Permission.find({
    action: { $in: actionFilters },
  });
  const permissionIds = permissions.map((p) => p._id);

  await Role.updateOne(
    { name: roleName },
    { $addToSet: { permissions: { $each: permissionIds } } }
  );
};

const assignPermissionsByCodes = async (roleName, permissionCodes) => {
  const permissions = await Permission.find({
    code: { $in: permissionCodes },
  });
  const permissionIds = permissions.map((p) => p._id);

  await Role.updateOne(
    { name: roleName },
    { $addToSet: { permissions: { $each: permissionIds } } }
  );
};

const importData = async () => {
  try {
    await withRetry(async () => {
      await Currency.deleteMany();
      await Currency.insertMany(currencyData);
    }, "currency seed");

    await withRetry(async () => {
      await Country.deleteMany();
      await Country.insertMany(countryData);
    }, "country seed");

    await withRetry(async () => {
      await Attribute.deleteMany();
      await Attribute.insertMany(attributeData);
    }, "attribute seed");

    await withRetry(async () => {
      await AttributeValue.deleteMany();
      await AttributeValue.insertMany(attributeValueData);
    }, "attribute value seed");

    await seedPermissions();

    const permissionDocs = await Permission.find({});
    const permissionById = {};
    for (const perm of permissionDocs) {
      permissionById[perm.code] = perm._id;
    }

    const resolvedRoles = roleData.map((role) => ({
      ...role,
      permissions: (role.permissionCodes || [])
        .filter((code) => permissionById[code])
        .map((code) => permissionById[code]),
    }));

    await RoleTemplate.deleteMany();
    await RoleTemplateService.seedDefaultTemplates();

    await Role.deleteMany();
    await Role.insertMany(resolvedRoles);

    await Admin.deleteMany();
    const roleDocs = await Role.find({});
    const roleByName = {};
    for (const r of roleDocs) {
      roleByName[r.name] = r._id;
    }

    const mappedAdminData = adminData.map(({ role, ...admin }) => ({
      ...admin,
      role: (Array.isArray(role) ? role : [role])
        .map((roleName) => roleByName[roleName])
        .filter(Boolean),
    }));
    await Admin.insertMany(mappedAdminData);

    await Category.deleteMany();
    await Category.insertMany(categoryData);

    await Product.deleteMany();
    await Product.insertMany(productData.map(mapProduct));

    await Setting.deleteMany();
    await Setting.insertMany(settingData);

    for (const role of DEFAULT_ROLES) {
      await assignPermissionsByCodes(role.name, role.permissionCodes);
    }

    const activeStore = (await Store.findOne({ isSelected: true })) || (await Store.findOne());
    const author = await Admin.findOne({ email: "admin@gmail.com" });

    if (activeStore && author) {
      const withStoreId = (doc) => ({ ...doc, storeId: activeStore._id });

      await PostCategory.deleteMany();
      await PostCategory.insertMany(postCategoryData.map(withStoreId));

      await PostTag.deleteMany();
      await PostTag.insertMany(postTagData.map(withStoreId));

      await Post.deleteMany();
      await Post.insertMany(
        postData.map((post) => ({ ...withStoreId(post), authorId: author._id }))
      );

      await PostComment.deleteMany();
      await PostComment.insertMany(postCommentData.map(withStoreId));
    } else {
      logger.warn(
        "Blog seed skipped: no store found (create one from the admin first) or no admin@gmail.com account."
      );
    }

if (activeStore) {
      await PaymentSettings.deleteMany();
      await PaymentSettings.create({
        storeId: activeStore._id,
        methods: paymentSettingsData,
      });
    }

    await Feature.deleteMany();
    await seedFeatureGroups();
    await seedFeatures();

    await QuotaType.deleteMany();
    await seedQuotaTypes();

    await seedPlans();
    await seedPayments();

    await PlatformCoupon.deleteMany();
    await PlatformCoupon.insertMany(platformCouponData);
    console.log(`Seeded ${platformCouponData.length} platform coupons`);

    await seedSuperAdmin();
    await seedAdminStore();
    await seedFeatureGroups();
    await seedFeatures();
    await seedQuotaTypes();
    await seedStoreSubscriptions();
    await seedInvoices();
    await migrateCustomers();
    await seedNotificationTemplates();

    logger.info("data inserted successfully!");
    process.exit();
  } catch (error) {
    logger.error("error", error);
    process.exit(1);
  }
};

const seedAdminStore = async () => {
  const ADMIN_EMAIL = "adminstore@gmail.com";
  const ADMIN_PASSWORD = "12345678";
  const STORE_NAME = "Admin Store";

  const existingUser = await Admin.findOne({ email: ADMIN_EMAIL, deletedAt: null });
  if (existingUser) {
    logger.info(`seedAdminStore: user ${ADMIN_EMAIL} already exists`);
    return;
  }

  const adminRole = await Role.findOne({ slug: "store-owner" });
  if (!adminRole) {
    throw new Error("store-owner role not found after seedPermissions");
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const user = await Admin.create({
    name: "Admin Store",
    email: ADMIN_EMAIL,
    password: hashedPassword,
    role: [adminRole._id],
    userType: "store_admin",
    isSuperAdmin: false,
    status: "Active",
    emailVerified: true,
    firstName: "Admin",
    lastName: "Store",
  });
  logger.info(`Created user ${ADMIN_EMAIL} from seed`);

  let plan = await Plan.findOne({});
  if (!plan) {
    plan = await Plan.create({
      name: "Basic",
      slug: "basic",
      status: "active",
      pricing: { monthly: 0, yearly: 0 },
      features: {},
      quotas: { products: 10, staff: 1, stores: 1, orders: 100 },
    });
    logger.info("Created default Basic plan for admin store from seed");
  }

  let store = await Store.findOne({ name: STORE_NAME });
  if (!store) {
    store = await Store.create({
      name: STORE_NAME,
      slug: "admin-store",
      status: "active",
      subscriptionStatus: "active",
      ownerId: user._id,
      owner: user._id,
      planId: plan._id,
      planName: plan.name,
      planSlug: plan.slug,
      billingCycle: "monthly",
      currency: "USD",
      isActive: true,
      isSelected: true,
    });
    logger.info(`Created store ${STORE_NAME} from seed`);
  }

  const existingUserStore = await UserStore.findOne({ userId: user._id, storeId: store._id });
  if (!existingUserStore) {
    await UserStore.create({ userId: user._id, storeId: store._id });
    logger.info("Linked user to store from seed");
  }

  const existingSubscription = await Subscription.findOne({ storeId: store._id });
  if (!existingSubscription) {
    await Subscription.create({
      storeId: store._id,
      planId: plan._id,
      currentPlanName: plan.name,
      status: "active",
      billingCycle: "monthly",
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      events: [
        {
          type: "created",
          message: "Admin store subscription created from seed",
          data: { planId: plan._id, planName: plan.name },
          actor: user._id,
          createdAt: new Date(),
        },
      ],
    });
    logger.info("Created subscription for admin store from seed");
  }

  user.storeIds = [store._id];
  user.primaryStoreId = store._id;
  user.currentStoreId = store._id;
  user.selectedStore = store._id;
  await user.save();

  logger.info(`Admin store seed completed from import: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
};