require("dotenv").config();
const mongoose = require("mongoose");
const PaymentMethod = require("../models/payment/PaymentMethod");
const { DEFAULT_PAYMENT_METHODS } = require("../utils/paymentMethods");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const seedPaymentMethods = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const existingCount = await PaymentMethod.countDocuments();
    if (existingCount > 0) {
      console.log(`Payment methods already seeded (${existingCount} found). Skipping.`);
      await mongoose.disconnect();
      return;
    }

    const methods = DEFAULT_PAYMENT_METHODS.map((method) => ({
      code: method.key,
      name: method.title,
      description: method.description,
      type: ["bank_transfer", "cheque", "cod"].includes(method.key) ? "offline" : "online",
      icon: "",
      displayOrder: method.order,
      status: "active",
      visibility: "public",
      compatibleCountries: ["*"],
      compatibleCurrencies: ["*"],
      compatibleMethods: [method.key],
    }));

    const created = await PaymentMethod.insertMany(methods);
    console.log(`Seeded ${created.length} payment methods:`);
    created.forEach((m) => console.log(`  - ${m.code}: ${m.name}`));

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Seeding failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedPaymentMethods();
