require("dotenv").config();
const mongoose = require("mongoose");
const PaymentProvider = require("../models/payment/PaymentProvider");
const PaymentMethod = require("../models/payment/PaymentMethod");
const { DEFAULT_PAYMENT_METHODS } = require("../utils/paymentMethods");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPaymentProviders = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const providers = [
      {
        code: "stripe",
        name: "Stripe",
        description: "Accept credit and debit cards directly on the checkout page.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["usd", "eur", "gbp"],
        compatibleMethods: ["card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#635bff" },
        metadata: { docsUrl: "https://stripe.com/docs" },
      },
      {
        code: "paypal",
        name: "PayPal",
        description: "Send your customers to PayPal to approve the payment.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["usd", "eur", "gbp"],
        compatibleMethods: ["paypal"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#003087" },
        metadata: { docsUrl: "https://developer.paypal.com/docs" },
      },
      {
        code: "razorpay",
        name: "Razorpay",
        description: "Indian payment gateway supporting cards, UPI, and wallets.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["in"],
        compatibleCurrencies: ["inr"],
        compatibleMethods: ["card", "upi", "wallet"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#2d8cf0" },
        metadata: { docsUrl: "https://razorpay.com/docs" },
      },
      {
        code: "konnect",
        name: "Konnect",
        description: "Tunisian payment gateway: wallet, bank card and e-DINAR.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["card", "wallet"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#e6007e" },
        metadata: { docsUrl: "https://konnect.net" },
      },
      {
        code: "flouci",
        name: "Flouci",
        description: "Tunisian payment gateway: pay by card or from the Flouci app.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#00b14f" },
        metadata: { docsUrl: "https://flouci.com" },
      },
      {
        code: "bank_transfer",
        name: "Virement bancaire",
        description: "Acceptez les paiements en personne avec BACS. Aussi connu sous le nom de virement bancaire.",
        type: "manual",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["*"],
        compatibleMethods: ["bank_transfer"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#6b7280" },
        metadata: { docsUrl: "" },
      },
      {
        code: "cheque",
        name: "Paiements par chéque",
        description: "Accepter les paiements par chéque en personne. Cette passerelle hors-ligne peut être utile pour tester les achats.",
        type: "manual",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["*"],
        compatibleMethods: ["cheque"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#6b7280" },
        metadata: { docsUrl: "" },
      },
      {
        code: "cod",
        name: "Paiement à la livraison",
        description: "Demandez  vos clients de payer en espéces (ou par tout autre moyen) à la livraison.",
        type: "manual",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["*"],
        compatibleMethods: ["cod"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: false,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#6b7280" },
        metadata: { docsUrl: "" },
      },
      {
        code: "manual",
        name: "Manual Payment",
        description: "Offline payment methods such as bank transfer, check, or cash on delivery.",
        type: "manual",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["*"],
        compatibleMethods: [],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#6b7280" },
        metadata: { docsUrl: "" },
      },
      {
        code: "paymee",
        name: "Paymee",
        description: "Tunisian payment gateway: cards and e-DINAR.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["card", "edinar"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#0ea5e9" },
        metadata: { docsUrl: "https://paymee.tn" },
      },
      {
        code: "clicktopay",
        name: "ClicToPay / SMT",
        description: "Payment gateway with card support. Webhook available according to contract.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#f59e0b" },
        metadata: { docsUrl: "https://smt.com.tn" },
      },
      {
        code: "edinar",
        name: "e-Dinar",
        description: "Tunisian e-DINAR payment gateway. Sandbox access is limited.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["edinar"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: false,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#10b981" },
        metadata: { docsUrl: "https://edinar.tn" },
      },
      {
        code: "zitounapay",
        name: "Zitouna Pay",
        description: "Zitouna Bank payment gateway. Available according to commercial offer.",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["tn"],
        compatibleCurrencies: ["tnd"],
        compatibleMethods: ["card"],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: false,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: false,
        display: { logo: "", color: "#6366f1" },
        metadata: { docsUrl: "https://zitounabank.com.tn" },
      },
    ];

    const existingCount = await PaymentProvider.countDocuments();
    if (existingCount > 0) {
      console.log(`Payment providers already seeded (${existingCount} found). Checking for missing providers...`);

      const existingCodes = await PaymentProvider.find({}).distinct("code");
      const newProviders = providers.filter((p) => !existingCodes.includes(p.code));

      if (newProviders.length === 0) {
        console.log("All providers already exist. Skipping.");
        await mongoose.disconnect();
        return;
      }

      console.log(`Adding ${newProviders.length} missing providers...`);
      const created = await PaymentProvider.insertMany(newProviders);
      console.log(`Added ${created.length} payment providers:`);
      created.forEach((p) => console.log(`  - ${p.code}: ${p.name}`));

      const methods = await PaymentMethod.find({}).lean();
      const methodById = new Map(methods.map((m) => [m.code, m._id]));

      const links = [];
      for (const provider of created) {
        for (const methodCode of provider.compatibleMethods) {
          const methodId = methodById.get(methodCode);
          if (methodId) {
            links.push({
              paymentMethodId: methodId,
              paymentProviderId: provider._id,
              priority: 1,
              status: "active",
            });
          }
        }
      }

      if (links.length) {
        const PaymentMethodProviderLink = require("../models/payment/PaymentMethodProviderLink");
        await PaymentMethodProviderLink.insertMany(links, { ordered: false });
        console.log(`Created ${links.length} payment method-provider links`);
      }

      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
      return;
    }

    const created = await PaymentProvider.insertMany(providers);
    console.log(`Seeded ${created.length} payment providers:`);
    created.forEach((p) => console.log(`  - ${p.code}: ${p.name}`));

    const methods = await PaymentMethod.find({}).lean();
    const methodById = new Map(methods.map((m) => [m.code, m._id]));

    const links = [];
    for (const provider of created) {
      for (const methodCode of provider.compatibleMethods) {
        const methodId = methodById.get(methodCode);
        if (methodId) {
          links.push({
            paymentMethodId: methodId,
            paymentProviderId: provider._id,
            priority: 1,
            status: "active",
          });
        }
      }
    }

    if (links.length) {
      const PaymentMethodProviderLink = require("../models/payment/PaymentMethodProviderLink");
      await PaymentMethodProviderLink.insertMany(links, { ordered: false });
      console.log(`Created ${links.length} payment method-provider links`);
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedPaymentProviders();
