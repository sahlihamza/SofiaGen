const mongoose = require("mongoose");
const PaymentMethod = require("../models/payment/PaymentMethod");
const PaymentProvider = require("../models/payment/PaymentProvider");
const PaymentRule = require("../models/payment/PaymentRule");
const PaymentMethodProviderLink = require("../models/payment/PaymentMethodProviderLink");
const PaymentProviderConfiguration = require("../models/payment/PaymentProviderConfiguration");
const PaymentGlobalSettings = require("../models/payment/PaymentGlobalSettings");
const Permission = require("../models/Permission");
const Role = require("../models/Role");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPayments = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Permission.deleteMany({ code: { $regex: /^payments\./ } });
    await PaymentMethod.deleteMany({});
    await PaymentProvider.deleteMany({});
    await PaymentRule.deleteMany({});
    await PaymentMethodProviderLink.deleteMany({});
    await PaymentProviderConfiguration.deleteMany({});
    await PaymentGlobalSettings.deleteMany({});

    console.log("Cleared existing payment data");

    await Permission.insertMany([
      { code: "payments.view", name: "View Payments", module: "payments", action: "view" },
      { code: "payments.create", name: "Create Payments", module: "payments", action: "create" },
      { code: "payments.update", name: "Update Payments", module: "payments", action: "update" },
      { code: "payments.delete", name: "Delete Payments", module: "payments", action: "delete" },
      { code: "payments.enable", name: "Enable Payments", module: "payments", action: "enable" },
      { code: "payments.disable", name: "Disable Payments", module: "payments", action: "disable" },
      { code: "payments.configure", name: "Configure Payments", module: "payments", action: "configure" },
    ]);
    console.log("Created payment permissions");

    const methods = await PaymentMethod.insertMany([
      {
        code: "cash_on_delivery",
        name: { en: "Cash on Delivery", fr: "Paiement à la livraison", ar: "'D/A9 9F/ 'D'3*D'E" },
        description: { en: "Pay with cash upon delivery", fr: "Payer en espéces à la livraison", ar: "'D/A9 FB/'K 9F/ 'D'3*D'E" },
        type: "offline",
        displayOrder: 1,
        status: "active",
        visibility: "public",
        supportsRefund: false,
        supportsPartialPayment: false,
        supportsSubscription: false,
      },
      {
        code: "bank_transfer",
        name: { en: "Bank Transfer", fr: "Virement bancaire", ar: "*-HJD (FCJ" },
        description: { en: "Pay via bank transfer", fr: "Payer par virement bancaire", ar: "'D/A9 9F 71JB 'D*-HJD 'D(FCJ" },
        type: "offline",
        displayOrder: 2,
        status: "active",
        visibility: "public",
        supportsRefund: true,
        supportsPartialPayment: true,
        supportsSubscription: false,
      },
      {
        code: "credit_card",
        name: { en: "Credit Card", fr: "Carte bancaire", ar: "(7'B) '&*E'F" },
        description: { en: "Pay with credit or debit card", fr: "Payer par carte de crédit ou débit", ar: "'D/A9 ((7'B) '&*E'F #H .5E" },
        type: "online",
        displayOrder: 3,
        status: "active",
        visibility: "public",
        supportsRefund: true,
        supportsPartialPayment: true,
        supportsSubscription: true,
      },
      {
        code: "mobile_payment",
        name: { en: "Mobile Payment", fr: "Paiement mobile", ar: "/A9 E*FBD" },
        description: { en: "Pay via mobile money", fr: "Payer via mobile money", ar: "'D/A9 9(1 'DE'D 'DE*FBD" },
        type: "online",
        displayOrder: 4,
        status: "active",
        visibility: "public",
        supportsRefund: true,
        supportsPartialPayment: false,
        supportsSubscription: true,
      },
      {
        code: "e_wallet",
        name: { en: "E-Wallet", fr: "Portefeuille électronique", ar: "E-A8) %DC*1HFJ)" },
        description: { en: "Pay with digital wallet", fr: "Payer avec un portefeuille numérique", ar: "'D/A9 (E-A8) 1BEJ)" },
        type: "online",
        displayOrder: 5,
        status: "inactive",
        visibility: "public",
        supportsRefund: true,
        supportsPartialPayment: true,
        supportsSubscription: true,
      },
    ]);
    console.log(`Created ${methods.length} payment methods`);

    const providers = await PaymentProvider.insertMany([
      {
        code: "flouci",
        name: "Flouci",
        description: "Tunisian mobile payment provider",
        compatibleCountries: ["TN"],
        compatibleCurrencies: ["TND"],
        compatibleMethods: ["mobile_payment", "credit_card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        status: "active",
        enabled: true,
        type: "gateway",
        environment: "sandbox",
      },
      {
        code: "konnect",
        name: "Konnect",
        description: "Tunisian payment gateway",
        compatibleCountries: ["TN"],
        compatibleCurrencies: ["TND", "EUR", "USD"],
        compatibleMethods: ["mobile_payment", "credit_card", "bank_transfer"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: true,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        status: "active",
        enabled: true,
        type: "gateway",
        environment: "sandbox",
      },
      {
        code: "click_to_pay",
        name: "Click To Pay",
        description: "Tunisian online payment gateway",
        compatibleCountries: ["TN"],
        compatibleCurrencies: ["TND"],
        compatibleMethods: ["credit_card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        status: "active",
        enabled: true,
        type: "gateway",
        environment: "sandbox",
      },
      {
        code: "bank_transfer",
        name: "Bank Transfer",
        description: "Manual bank transfer payment",
        compatibleCountries: ["TN"],
        compatibleCurrencies: ["TND"],
        compatibleMethods: ["bank_transfer"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        status: "active",
        enabled: true,
        type: "manual",
        environment: "sandbox",
      },
      {
        code: "stripe",
        name: "Stripe",
        description: "International payment processor",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["USD", "EUR", "GBP", "TND"],
        compatibleMethods: ["credit_card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: true,
        supportsDeferredPayment: true,
        supportsWebhook: true,
        status: "inactive",
        enabled: false,
        type: "gateway",
        environment: "sandbox",
      },
      {
        code: "paypal",
        name: "PayPal",
        description: "Global online payments",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["USD", "EUR", "GBP"],
        compatibleMethods: ["credit_card", "e_wallet"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        status: "inactive",
        enabled: false,
        type: "gateway",
        environment: "sandbox",
      },
      {
        code: "razorpay",
        name: "Razorpay",
        description: "Indian payment gateway",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["INR", "USD", "EUR"],
        compatibleMethods: ["credit_card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: true,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        status: "inactive",
        enabled: false,
        type: "gateway",
        environment: "sandbox",
      },
    ]);
    console.log(`Created ${providers.length} payment providers`);

    const plans = await mongoose.model("Plan").find({});
    const planIds = plans.map((p) => p._id);

    const starterPlanId = plans.find((p) => p.slug === "starter")?._id;
    const professionalPlanId = plans.find((p) => p.slug === "professional")?._id;
    const enterprisePlanId = plans.find((p) => p.slug === "enterprise")?._id;

    const rules = [
      {
        paymentProviderId: providers.find((p) => p.code === "flouci")._id,
        countries: ["TN"],
        currencies: ["TND"],
        planIds: starterPlanId ? [starterPlanId] : [],
        storeTypes: ["retail", "restaurant"],
        clientTypes: ["individual", "business"],
        minAmount: 5,
        maxAmount: 500,
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
        priority: 1,
        status: "active",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "konnect")._id,
        countries: ["TN"],
        currencies: ["TND", "EUR"],
        planIds: [starterPlanId, professionalPlanId].filter(Boolean),
        storeTypes: ["retail", "restaurant", "ecommerce"],
        clientTypes: ["individual", "business", "enterprise"],
        minAmount: 10,
        maxAmount: 2000,
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
        priority: 2,
        status: "active",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "click_to_pay")._id,
        countries: ["TN"],
        currencies: ["TND"],
        planIds: professionalPlanId ? [professionalPlanId] : [],
        storeTypes: ["ecommerce"],
        clientTypes: ["individual", "business"],
        minAmount: 50,
        maxAmount: 5000,
        supportsOneTime: true,
        supportsSubscription: false,
        supportsRefund: true,
        priority: 3,
        status: "active",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "bank_transfer")._id,
        countries: ["TN"],
        currencies: ["TND"],
        planIds: [professionalPlanId, enterprisePlanId].filter(Boolean),
        storeTypes: ["retail", "ecommerce", "b2b"],
        clientTypes: ["business", "enterprise"],
        minAmount: 100,
        maxAmount: 50000,
        supportsOneTime: true,
        supportsSubscription: false,
        supportsRefund: true,
        priority: 4,
        status: "active",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "stripe")._id,
        countries: ["*"],
        currencies: ["USD", "EUR", "GBP", "TND"],
        planIds: planIds,
        storeTypes: ["retail", "restaurant", "ecommerce", "b2b", "saas"],
        clientTypes: ["individual", "business", "enterprise"],
        minAmount: 1,
        maxAmount: 100000,
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
        priority: 5,
        status: "inactive",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "paypal")._id,
        countries: ["*"],
        currencies: ["USD", "EUR", "GBP"],
        planIds: [starterPlanId, professionalPlanId].filter(Boolean),
        storeTypes: ["ecommerce", "saas"],
        clientTypes: ["individual", "business"],
        minAmount: 5,
        maxAmount: 50000,
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
        priority: 6,
        status: "inactive",
      },
      {
        paymentProviderId: providers.find((p) => p.code === "razorpay")._id,
        countries: ["*"],
        currencies: ["INR", "USD", "EUR"],
        planIds: planIds,
        storeTypes: ["ecommerce", "saas", "b2b"],
        clientTypes: ["individual", "business", "enterprise"],
        minAmount: 10,
        maxAmount: 500000,
        supportsOneTime: true,
        supportsSubscription: true,
        supportsRefund: true,
        priority: 7,
        status: "inactive",
      },
    ];

    await PaymentRule.insertMany(rules);
    console.log(`Created ${rules.length} payment rules`);

    const links = [];
    for (const method of methods) {
      for (const provider of providers) {
        if (provider.compatibleMethods.includes(method.code)) {
          links.push({
            paymentMethodId: method._id,
            paymentProviderId: provider._id,
            priority: 1,
            status: "active",
          });
        }
      }
    }
    await PaymentMethodProviderLink.insertMany(links);
    console.log(`Created ${links.length} payment method-provider links`);

    for (const provider of providers) {
      await PaymentProviderConfiguration.findOneAndUpdate(
        { paymentProviderId: provider._id },
        {
          paymentProviderId: provider._id,
          timeout: 30000,
          retryCount: 3,
          retryDelay: 1000,
          environment: provider.environment || "sandbox",
          keyRotationEnabled: true,
          status: provider.enabled ? "active" : "inactive",
          isActive: provider.enabled,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`Created ${providers.length} provider configurations`);

    await PaymentGlobalSettings.insertMany([
      { key: "payment_maintenance_mode", value: false, type: "boolean", category: "general", description: "Enable maintenance mode for payments", isEditable: true },
      { key: "payment_timeout", value: 30000, type: "number", category: "timeout", description: "Payment request timeout in milliseconds", isEditable: true },
      { key: "payment_retry_count", value: 3, type: "number", category: "retry", description: "Number of retries for failed payments", isEditable: true },
      { key: "payment_retry_delay", value: 1000, type: "number", category: "retry", description: "Delay between retries in milliseconds", isEditable: true },
      { key: "payment_logging_enabled", value: true, type: "boolean", category: "logging", description: "Enable payment logging", isEditable: true },
      { key: "payment_notification_enabled", value: true, type: "boolean", category: "notification", description: "Enable payment notifications", isEditable: true },
      { key: "payment_alert_email", value: "", type: "string", category: "alerts", description: "Email for payment alerts", isEditable: true },
      { key: "payment_failed_alert_threshold", value: 5, type: "number", category: "alerts", description: "Number of failed payments before sending alert", isEditable: true },
      { key: "payment_key_rotation_days", value: 90, type: "number", category: "security", description: "Days between key rotations", isEditable: true },
    ]);
    console.log("Created global payment settings");

    console.log("\n=== Payment Seed Summary ===");
    console.log(`Payment Methods: ${methods.length}`);
    console.log(`Payment Providers: ${providers.length}`);
    console.log(`Payment Rules: ${rules.length}`);
    console.log(`Payment Links: ${links.length}`);
    console.log(`Provider Configurations: ${providers.length}`);
    console.log(`Global Settings: 9`);
    console.log("\nDone! Payment data seeded successfully.");

    // NOTE: do not mongoose.disconnect() here  seed.js shares this connection
    // for every following seeding section.
  } catch (err) {
    console.error("Error seeding payment data:", err);
    throw err;
  }
};

module.exports = { seedPayments };
