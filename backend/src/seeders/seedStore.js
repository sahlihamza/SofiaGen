const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const StoreUsage = require("../models/StoreUsage");
const QuotaType = require("../models/QuotaType");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const rolesData = [
  { name: "super_admin", slug: "super_admin", label: "Super Admin", description: "Full system access", scope: "platform" },
  { name: "admin", slug: "admin", label: "Admin", description: "Store admin access", scope: "store" },
  { name: "staff", slug: "staff", label: "Staff", description: "Limited staff access", scope: "store" },
  { name: "customer", slug: "customer", label: "Customer", description: "Customer access", scope: "store" },
];

const usersData = [
  { name: "Super Admin", email: "superadmin@sofiaegen.com", role: "super_admin" },
  { name: "Alice Owner", email: "alice@example.com", role: "admin" },
  { name: "Bob Owner", email: "bob@example.com", role: "admin" },
  { name: "Charlie Owner", email: "charlie@example.com", role: "admin" },
  { name: "Diana Owner", email: "diana@example.com", role: "admin" },
  { name: "Eve Owner", email: "eve@example.com", role: "admin" },
  { name: "Staff User 1", email: "staff1@example.com", role: "staff" },
  { name: "Staff User 2", email: "staff2@example.com", role: "staff" },
  { name: "Staff User 3", email: "staff3@example.com", role: "staff" },
  { name: "Staff User 4", email: "staff4@example.com", role: "staff" },
  { name: "Staff User 5", email: "staff5@example.com", role: "staff" },
];

const storesData = [
  { name: "Store Alpha", slug: "store-alpha", domain: "alpha.example.com", status: "active", subscriptionStatus: "active" },
  { name: "Store Beta", slug: "store-beta", domain: "beta.example.com", status: "active", subscriptionStatus: "active" },
  { name: "Store Gamma", slug: "store-gamma", domain: "gamma.example.com", status: "active", subscriptionStatus: "trial" },
  { name: "Store Delta", slug: "store-delta", domain: "delta.example.com", status: "pending", subscriptionStatus: "pending" },
  { name: "Store Epsilon", slug: "store-epsilon", domain: "epsilon.example.com", status: "active", subscriptionStatus: "active" },
];

const plansData = [
  { name: "Starter", slug: "starter", pricing: { monthly: 29, yearly: 290 }, features: { apiAccess: true, customBranding: false, customReports: false, multiStore: false, prioritySupport: false }, quotas: { products: 50, staff: 2, stores: 1, orders: 1000 } },
  { name: "Professional", slug: "professional", pricing: { monthly: 79, yearly: 790 }, features: { apiAccess: true, customBranding: true, customReports: true, multiStore: false, prioritySupport: false }, quotas: { products: 200, staff: 5, stores: 1, orders: 5000 } },
  { name: "Enterprise", slug: "enterprise", pricing: { monthly: 199, yearly: 1990 }, features: { apiAccess: true, customBranding: true, customReports: true, multiStore: true, prioritySupport: true }, quotas: { products: 1000, staff: 20, stores: 5, orders: 20000 } },
];

const paymentMethods = ["stripe", "paypal", "bank_transfer", "credit_card"];
const paymentStatuses = ["succeeded", "succeeded", "succeeded", "pending", "failed"];
const subscriptionStatuses = ["active", "trial", "past_due", "canceled", "expired"];
const billingCycles = ["monthly", "yearly"];
const storeStatuses = ["active", "inactive", "suspended", "pending"];
const subscriptionStatusesList = ["active", "trial", "past_due", "canceled", "expired", "pending"];

const generateTransactionId = () => `txn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const seedAll = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await StoreUsage.deleteMany({});
    await QuotaType.deleteMany({});
    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    await Subscription.deleteMany({});
    await Store.deleteMany({});
    await Plan.deleteMany({});
    await User.deleteMany({});
    await Role.deleteMany({});

    console.log("Cleared existing data");

    const roles = await Role.insertMany(rolesData);
    console.log(`Created ${roles.length} roles`);

    const roleMap = {};
    roles.forEach((r) => { roleMap[r.name] = r._id; });

    const users = [];
    for (const u of usersData) {
      const user = new User({
        name: u.name,
        email: u.email,
        password: "$2a$10$hashedpasswordplaceholder",
        role: roleMap[u.role],
        roleName: u.role,
        isActive: true,
        emailVerified: true,
      });
      users.push(user);
    }
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    const userMap = {};
    createdUsers.forEach((u) => { userMap[u.name] = u; });

    const plans = await Plan.insertMany(
      plansData.map((p) => ({
        ...p,
        status: "active",
        createdAt: new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }))
    );
    console.log(`Created ${plans.length} plans`);

    const planMap = {};
    plans.forEach((p) => { planMap[p.name] = p; });

    const stores = [];
    for (let i = 0; i < storesData.length; i++) {
      const sd = storesData[i];
      const owner = createdUsers[i + 1];
      const plan = plans[i % plans.length];
      const store = new Store({
        ...sd,
        ownerId: owner._id,
        owner: owner._id,
        planId: plan._id,
        planName: plan.name,
        planSlug: plan.slug,
        billingCycle: billingCycles[Math.floor(Math.random() * billingCycles.length)],
        currentPeriodEnd: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        trialEndsAt: sd.subscriptionStatus === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      });
      stores.push(store);
    }
    const createdStores = await Store.insertMany(stores);
    console.log(`Created ${createdStores.length} stores`);

    const storeMap = {};
    createdStores.forEach((s) => { storeMap[s.name] = s; });

    const quotaTypes = await QuotaType.insertMany([
      { code: "products", name: "Products", description: "Nombre de produits" },
      { code: "admins", name: "Admins", description: "Nombre d\'administrateurs" },
      { code: "images", name: "Images", description: "Nombre d\'images" },
      { code: "storage", name: "Storage", description: "Espace de stockage en GB" },
    ]);
    console.log(`Created ${quotaTypes.length} quota types`);

    await Subscription.deleteMany({});
    const subscriptions = [];
    for (let i = 0; i < createdStores.length; i++) {
      const store = createdStores[i];
      const plan = planMap[store.planName] || plans[i % plans.length];
      const sub = new Subscription({
        storeId: store._id,
        planId: plan._id,
        currentPlanName: plan.name,
        status: subscriptionStatusesList[Math.floor(Math.random() * subscriptionStatusesList.length)],
        billingCycle: billingCycles[Math.floor(Math.random() * billingCycles.length)],
        startedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        trialEnd: store.trialEndsAt,
        events: [
          {
            type: "created",
            message: "Subscription created",
            data: { planId: plan._id, planName: plan.name },
            actor: null,
            createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          },
        ],
      });
      subscriptions.push(sub);
    }
    const createdSubscriptions = await Subscription.insertMany(subscriptions);
    console.log(`Created ${createdSubscriptions.length} subscriptions`);

    await Invoice.deleteMany({});
    const invoices = [];
    for (let i = 0; i < createdSubscriptions.length; i++) {
      const sub = createdSubscriptions[i];
      const plan = planMap[sub.currentPlanName] || plans[i % plans.length];
      const store = createdStores[i % createdStores.length];
      const invoice = new Invoice({
        invoiceNumber: generateInvoiceNumber(),
        storeId: store._id,
        subscriptionId: sub._id,
        planId: plan._id,
         baseAmount: plan.pricing?.monthly || 0,
         items: [
           {
             description: `Plan: ${plan.name} (${plan.slug})`,
             quantity: 1,
             unitPrice: plan.pricing?.monthly || 0,
             total: plan.pricing?.monthly || 0,
           },
         ],
         subtotal: plan.pricing?.monthly || 0,
        tax: 0,
        total: plan.pricing?.monthly || 0,
        currency: "USD",
        status: ["paid", "paid", "paid", "sent", "overdue"][Math.floor(Math.random() * 5)],
        paidAt: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        dueDate: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });
      invoices.push(invoice);
    }
    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`Created ${createdInvoices.length} invoices`);

    await Payment.deleteMany({});
    const payments = [];
    for (let i = 0; i < 25; i++) {
      const sub = createdSubscriptions[i % createdSubscriptions.length];
      const plan = planMap[sub.currentPlanName] || plans[i % plans.length];
      const store = createdStores[i % createdStores.length];
      const invoice = createdInvoices[i % createdInvoices.length];
      const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
      const amount = plan.pricing?.monthly || 0;

      const payment = new Payment({
        storeId: store._id,
        orderId: null,
        subscriptionId: sub._id,
        invoiceId: invoice._id,
        amount,
        currency: "USD",
        method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        status,
        transactionId: generateTransactionId(),
        paidAt: status === "succeeded" ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
        meta: {
          source: "stripe",
          customerEmail: `customer${i + 1}@example.com`,
          description: `Payment for ${plan.name} plan - ${store.name}`,
        },
      });
      payments.push(payment);
    }
    await Payment.insertMany(payments);
    console.log(`Created ${payments.length} payments`);

    await StoreUsage.deleteMany({});
    const storeUsages = [];
    for (const store of createdStores) {
      for (const qt of quotaTypes) {
        const used = qt.code === "storage" ? Math.floor(Math.random() * 10000) : Math.floor(Math.random() * 500);
        storeUsages.push(new StoreUsage({
          storeId: store._id,
          quotaTypeId: qt._id,
          used,
        }));
      }
    }
    if (storeUsages.length > 0) {
      await StoreUsage.insertMany(storeUsages);
      console.log(`Created ${storeUsages.length} store usage records`);
    }

    for (const store of createdStores) {
      store.currentSubscriptionId = createdSubscriptions.find(
        (s) => s.storeId.equals(store._id)
      )?._id || null;
    }
    await Promise.all(createdStores.map((s) => s.save()));

    console.log("\n=== Seed Data Summary ===");
    console.log(`Roles: ${roles.length}`);
    console.log(`Users: ${createdUsers.length}`);
    console.log(`Plans: ${plans.length}`);
    console.log(`Stores: ${createdStores.length}`);
    console.log(`Subscriptions: ${createdSubscriptions.length}`);
    console.log(`Invoices: ${createdInvoices.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Quota Types: ${quotaTypes.length}`);
    console.log(`Store Usages: ${storeUsages.length}`);
    console.log("\nDone! All data created from scratch.");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding data:", err);
    process.exit(1);
  }
};

seedAll();