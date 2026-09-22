require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Role = require("../models/Role");
const User = require("../models/User");
const Store = require("../models/Store");
const UserStore = require("../models/UserStore");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const QuotaType = require("../models/QuotaType");
const StoreUsage = require("../models/StoreUsage");
const Permission = require("../models/Permission");
const seedPermissions = require("../script/seedPermissions");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const ADMIN_EMAIL = "adminstore@gmail.com";
const ADMIN_PASSWORD = "12345678";
const ADMIN_NAME = "Admin Store";

const STORE_NAME = "Admin Store";
const STORE_SLUG = "admin-store";
const STORE_DOMAIN = "admin-store.example.com";

const ROLE_SLUG = "adminstore";

const PLAN_SLUG = "seed-starter";

const seedAdminStore = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await seedPermissions();

    const permissions = await Permission.find({});
    const storePermissions = permissions.filter((p) => p.scope === "store");
    const storePermissionIds = storePermissions.map((p) => p._id);

    let adminRole = await Role.findOne({ slug: ROLE_SLUG, scope: "store" });
    if (adminRole) {
      adminRole = await Role.findByIdAndUpdate(
        adminRole._id,
        {
          name: "adminstore",
          slug: ROLE_SLUG,
          description: "Store owner with dedicated store management permissions",
          scope: "store",
          isPredefined: true,
          permissions: storePermissionIds,
        },
        { new: true }
      );
    } else {
      adminRole = await Role.create({
        name: "adminstore",
        slug: ROLE_SLUG,
        description: "Store owner with dedicated store management permissions",
        scope: "store",
        isPredefined: true,
        permissions: storePermissionIds,
      });
    }
    console.log(`Role ready: ${adminRole.name} (${adminRole.slug})`);

    let plan = await Plan.findOne({ slug: PLAN_SLUG });
    if (!plan) {
      plan = await Plan.create({
        name: "Seed Starter",
        slug: PLAN_SLUG,
        description: "Starter plan used for admin store demo",
        pricing: { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false, trialDays: 14 },
        features: new Map([
          ["multi_store", false],
          ["priority_support", false],
        ]),
        limits: new Map([
          ["products", 25],
          ["storage_mb", 200],
          ["team_members", 1],
        ]),
        status: "active",
        isDefault: true,
      });
    }
    console.log(`Plan ready: ${plan.name} (${plan.slug})`);

    const quotaTypeCodes = ["products", "orders", "admins", "images", "storage"];
    const quotaTypes = [];
    for (const code of quotaTypeCodes) {
      let qt = await QuotaType.findOne({ code });
      if (!qt) {
        qt = await QuotaType.create({ code, name: code.charAt(0).toUpperCase() + code.slice(1), unit: code === "storage" ? "gb" : "number", allowUnlimited: true });
      }
      quotaTypes.push(qt);
    }
    console.log(`Quota types ready: ${quotaTypes.length}`);

    let adminUser = await User.findOne({ email: ADMIN_EMAIL, deletedAt: null });
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (adminUser) {
      adminUser = await User.findByIdAndUpdate(
        adminUser._id,
        {
          name: ADMIN_NAME,
          email: ADMIN_EMAIL,
          password: hashedPassword,
          role: [adminRole._id],
          userType: "store_admin",
          status: "Active",
          emailVerified: true,
          isSuperAdmin: false,
          provider: "local",
        },
        { new: true }
      );
    } else {
      adminUser = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: [adminRole._id],
        userType: "store_admin",
        status: "Active",
        emailVerified: true,
        isSuperAdmin: false,
        provider: "local",
      });
    }
    console.log(`User ready: ${adminUser.email}`);

    let store = await Store.findOne({ slug: STORE_SLUG });
    if (!store) {
      store = await Store.create({
        name: STORE_NAME,
        slug: STORE_SLUG,
        domain: STORE_DOMAIN,
        status: "active",
        subscriptionStatus: "trial",
        billingCycle: "monthly",
        currency: "USD",
        ownerId: adminUser._id,
        owner: adminUser._id,
        isActive: true,
        isSelected: true,
        planId: plan._id,
        planName: plan.name,
        planSlug: plan.slug,
      });
    } else {
      store = await Store.findByIdAndUpdate(
        store._id,
        {
          ownerId: adminUser._id,
          owner: adminUser._id,
          planId: plan._id,
          planName: plan.name,
          planSlug: plan.slug,
          status: "active",
          subscriptionStatus: "trial",
          isActive: true,
        },
        { new: true }
      );
    }
    console.log(`Store ready: ${store.name} (${store.slug})`);

    let userStore = await UserStore.findOne({ userId: adminUser._id, storeId: store._id });
    if (!userStore) {
      await UserStore.create({
        userId: adminUser._id,
        storeId: store._id,
      });
    }
    console.log("UserStore link ready");

    let subscription = await Subscription.findOne({ storeId: store._id });
    if (!subscription) {
      subscription = await Subscription.create({
        storeId: store._id,
        planId: plan._id,
        currentPlanName: plan.name,
        status: "trial",
        billingCycle: "monthly",
        priceSnapshot: {
          monthly: plan.pricing?.monthly,
          yearly: plan.pricing?.yearly,
          currency: plan.pricing?.currency,
          taxIncluded: plan.pricing?.taxIncluded,
        },
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isAutoRenew: true,
        quotaUsage: new Map([
          ["products", 0],
          ["storage_mb", 0],
          ["team_members", 1],
        ]),
        events: [
          { type: "created", message: "Admin store subscription created" },
          { type: "trial_started", message: "Trial started for admin store" },
        ],
      });
    }
    console.log(`Subscription ready: ${subscription.status}`);

    await Store.findByIdAndUpdate(store._id, { currentSubscriptionId: subscription._id });

    await User.findByIdAndUpdate(adminUser._id, {
      storeIds: [store._id],
      selectedStore: store._id,
      currentStoreId: store._id,
    });

    for (const qt of quotaTypes) {
      await StoreUsage.updateOne(
        { storeId: store._id, quotaTypeId: qt._id },
        { storeId: store._id, quotaTypeId: qt._id, used: 0 },
        { upsert: true }
      );
    }

    console.log("\n=== Admin Store Seed Summary ===");
    console.log(`Email   : ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`Role    : ${adminRole.name}`);
    console.log(`Store   : ${store.name} (${store.slug})`);
    console.log(`Plan    : ${plan.name}`);
    console.log(`Sub     : ${subscription.status}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding admin store:", err);
    process.exit(1);
  }
};

seedAdminStore();
