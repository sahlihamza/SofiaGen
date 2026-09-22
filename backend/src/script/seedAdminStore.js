require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const logger = require("../config/logger");
const Role = require("../models/Role");
const User = require("../models/User");
const Store = require("../models/Store");
const Subscription = require("../models/Subscription");
const UserStore = require("../models/UserStore");
const Plan = require("../models/Plan");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";
const ADMIN_EMAIL = "adminstore@gmail.com";
const ADMIN_PASSWORD = "12345678";
const STORE_NAME = "Admin Store";

const seedAdminStore = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info("Connected to MongoDB for admin store seed");

    const existingUser = await User.findOne({ email: ADMIN_EMAIL, deletedAt: null });
    if (!existingUser) {
      let adminRole = await Role.findOne({ slug: "store-owner", scope: "platform" });
      if (!adminRole) {
        adminRole = await Role.create({
          name: "Store Owner",
          slug: "store-owner",
          description: "Store owner with dedicated store management permissions",
          scope: "platform",
          isSystem: true,
          permissions: [],
        });
        logger.info("Created store-owner role");
      }

      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      const user = await User.create({
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
      logger.info(`Created user ${ADMIN_EMAIL}`);

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
        logger.info("Created default Basic plan for admin store");
      }

      let store = await Store.findOne({ name: STORE_NAME });
      if (!store) {
        store = await Store.create({
          name: STORE_NAME,
          slug: "admin-store",
          status: "active",
          subscriptionStatus: "active",
          ownerId: user._id,
          planId: plan._id,
          planName: plan.name,
          planSlug: plan.slug,
          billingCycle: "monthly",
          currency: "USD",
          isActive: true,
          isSelected: true,
        });
        logger.info(`Created store ${STORE_NAME}`);
      }

      const existingUserStore = await UserStore.findOne({ userId: user._id, storeId: store._id });
      if (!existingUserStore) {
        await UserStore.create({ userId: user._id, storeId: store._id });
        logger.info("Linked user to store");
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
              message: "Admin store subscription created",
              data: { planId: plan._id, planName: plan.name },
              actor: user._id,
              createdAt: new Date(),
            },
          ],
        });
        logger.info("Created subscription for admin store");
      }

      user.storeIds = [store._id];
      user.primaryStoreId = store._id;
      user.currentStoreId = store._id;
      user.selectedStore = store._id;
      await user.save();

      logger.info(`Admin store seed completed: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
      return user;
    }

    const user = existingUser;
    logger.info(`User ${ADMIN_EMAIL} already exists, ensuring store and subscription...`);

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
      logger.info("Created default Basic plan for admin store");
    }

    let store = await Store.findOne({ name: STORE_NAME });
    if (!store) {
      store = await Store.create({
        name: STORE_NAME,
        slug: "admin-store",
        status: "active",
        subscriptionStatus: "active",
        ownerId: user._id,
        planId: plan._id,
        planName: plan.name,
        planSlug: plan.slug,
        billingCycle: "monthly",
        currency: "USD",
        isActive: true,
        isSelected: true,
      });
      logger.info(`Created store ${STORE_NAME}`);
    } else if (!store.planId) {
      store.planId = plan._id;
      store.planName = plan.name;
      await store.save();
      logger.info("Updated store with default plan");
    }

    const existingUserStore = await UserStore.findOne({ userId: user._id, storeId: store._id });
    if (!existingUserStore) {
      await UserStore.create({ userId: user._id, storeId: store._id });
      logger.info("Linked user to store");
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
            message: "Admin store subscription created",
            data: { planId: plan._id, planName: plan.name },
            actor: user._id,
            createdAt: new Date(),
          },
        ],
      });
      logger.info("Created subscription for admin store");
    }

    user.storeIds = [store._id];
    user.primaryStoreId = store._id;
    user.currentStoreId = store._id;
    user.selectedStore = store._id;
    await user.save();

    logger.info(`Admin store seed completed: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    return user;
  } catch (error) {
    logger.error("Seed admin store error:", error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

if (process.env.NODE_ENV === "production") {
  console.error("Seed scripts cannot be run in production");
  process.exit(1);
}

seedAdminStore()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Failed to seed admin store:", error);
    process.exit(1);
  });
