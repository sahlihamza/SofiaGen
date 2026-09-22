const mongoose = require("mongoose");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const invoiceStatuses = ["draft", "sent", "paid", "overdue", "canceled"];

const generateInvoiceNumber = () => `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const seedInvoices = async () => {
  try {
    const stores = await Store.find({});
    if (stores.length === 0) {
      console.log("No stores found. Please run seed:store or seed:payments first.");
      return;
    }

    const plans = await Plan.find({});
    if (plans.length === 0) {
      console.log("No plans found. Please run seed:plans first.");
      return;
    }

    const subscriptions = await Subscription.find({});
    if (subscriptions.length === 0) {
      console.log("No subscriptions found. Please run seed:subscriptions first.");
      return;
    }

    console.log(`Found ${stores.length} stores, ${plans.length} plans, ${subscriptions.length} subscriptions`);

    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    console.log("Cleared existing invoices and payments");

    const invoices = [];
    let invoiceCount = 0;

    for (const sub of subscriptions) {
      const plan = plans.find((p) => p._id.equals(sub.planId)) || plans[0];
      const store = stores.find((s) => s._id.equals(sub.storeId)) || stores[0];
      const monthlyPrice = plan.pricing?.monthly || 0;
      const yearlyPrice = plan.pricing?.yearly || monthlyPrice * 10;
      const baseAmount = sub.billingCycle === "yearly" ? yearlyPrice : monthlyPrice;
      const currency = plan.pricing?.currency || "USD";

      const numInvoices = Math.floor(Math.random() * 3) + 2;

      for (let i = 0; i < numInvoices; i++) {
        const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
        const issuedAt = new Date(Date.now() - Math.random() * 120 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(issuedAt.getTime() + (status === "overdue" ? -5 : 15) * 24 * 60 * 60 * 1000);
        const paidAt = status === "paid" ? new Date(issuedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null;

        const taxRate = Math.random() > 0.5 ? 0.1 : 0;
        const tax = baseAmount * taxRate;
        const total = baseAmount + tax;

        const hasDiscount = Math.random() > 0.7;
        const discountAmount = hasDiscount ? Math.min(baseAmount * 0.1, 10) : 0;
        const subtotal = baseAmount - discountAmount;

        const invoiceNumber = generateInvoiceNumber();
        const invoice = {
          invoiceNumber,
          storeId: store._id,
          subscriptionId: sub._id,
          planId: plan._id,
          items: [
            {
              description: `${plan.name} (${plan.slug}) - ${sub.billingCycle === "yearly" ? "Yearly" : "Monthly"} Billing`,
              quantity: 1,
              unitPrice: baseAmount,
              total: baseAmount,
            },
          ],
          baseAmount,
          discounts: hasDiscount
            ? [
                {
                  code: `SAVE10`,
                  discountType: "percentage",
                  discountAmount,
                  appliedAt: issuedAt,
                },
              ]
            : [],
          subtotal,
          taxRate,
          tax,
          total,
          currency,
          status,
          paidAt,
          dueDate,
          issuedAt,
          metadata: {
            source: "seed",
            planName: plan.name,
            billingCycle: sub.billingCycle,
          },
        };

        invoices.push(invoice);
        invoiceCount++;
      }
    }

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`Created ${createdInvoices.length} invoices`);

    // Payment is strictly order-scoped (orderId is required, and its status
    // enum only knows Order.paymentStatus's values  "pending/paid/failed/
    // refunded/cancelled", never "succeeded"). This block used to fabricate
    // Payment rows for subscription invoices with orderId: null and
    // status: "succeeded", which the current model schema simply doesn't
    // allow  every run crashed npm run data:import here. Invoices already
    // carry their own status (paid/overdue/...), so seed data stays
    // meaningful without inventing Payment rows for a use case that model
    // doesn't support.
    const createdPayments = [];
    console.log(`Created ${createdPayments.length} payments (skipped  see comment above)`);

    console.log("\n=== Invoice Seed Data Summary ===");
    console.log(`Invoices: ${createdInvoices.length}`);
    console.log(`Payments: ${createdPayments.length}`);
    console.log("\nDone!");
  } catch (err) {
    console.error("Error seeding invoices:", err);
    process.exit(1);
  }
};

module.exports = { seedInvoices };

if (require.main === module) {
  (async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen");
      await seedInvoices();
      await mongoose.disconnect();
    } catch (error) {
      console.error("Error seeding invoices:", error);
      process.exit(1);
    }
  })();
}
