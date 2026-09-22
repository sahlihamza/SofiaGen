const mongoose = require("mongoose");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sofiagen";

const subscriptionStatuses = ["active", "trial", "past_due", "canceled", "expired", "pending"];
const billingCycles = ["monthly", "yearly"];

const generateTransactionId = () => `txn_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

const generateInvoiceNumber = () => `INV-SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

const seedSubscriptions = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await Payment.deleteMany({});
    await Invoice.deleteMany({});
    await Subscription.deleteMany({});

    console.log("Cleared existing subscription data");

    const stores = await Store.find({});
    if (stores.length === 0) {
      console.log("No stores found. Please run seed:store or seed:payments first.");
      await mongoose.disconnect();
      return;
    }

    const plans = await Plan.find({});
    if (plans.length === 0) {
      console.log("No plans found. Please run seed:plans first.");
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${stores.length} stores and ${plans.length} plans`);

    const subscriptions = [];
    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      const plan = plans[i % plans.length];
      const status = subscriptionStatuses[Math.floor(Math.random() * subscriptionStatuses.length)];
      const billingCycle = billingCycles[Math.floor(Math.random() * billingCycles.length)];
      const trialPeriod = status === "trial";
      const startedAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const currentPeriodStart = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const currentPeriodEnd = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);

      const sub = new Subscription({
        storeId: store._id,
        planId: plan._id,
        currentPlanName: plan.name,
        status,
        billingCycle,
        startedAt,
        currentPeriodStart,
        currentPeriodEnd,
        trialPeriod,
        trialEndsAt: trialPeriod ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
        endedAt: status === "canceled" || status === "expired" ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        priceSnapshot: {
          monthly: plan.pricing?.monthly || 0,
          yearly: plan.pricing?.yearly || 0,
          currency: plan.pricing?.currency || "USD",
          taxIncluded: plan.pricing?.taxIncluded || false,
        },
        isAutoRenew: status !== "canceled",
        quotaUsage: new Map(),
        events: [
          {
            type: "created",
            message: "Subscription created",
            data: { planId: plan._id, planName: plan.name },
            actor: null,
            createdAt: startedAt,
          },
          {
            type: status === "trial" ? "trial_started" : "activated",
            message: status === "trial" ? "Trial started" : "Subscription activated",
            data: { status },
            actor: null,
            createdAt: new Date(startedAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          },
        ],
      });
      subscriptions.push(sub);
    }

    const createdSubscriptions = await Subscription.insertMany(subscriptions);
    console.log(`Created ${createdSubscriptions.length} subscriptions`);

    const invoices = [];
    for (let i = 0; i < createdSubscriptions.length; i++) {
      const sub = createdSubscriptions[i];
      const plan = plans.find((p) => p._id.equals(sub.planId));
      const store = stores[i % stores.length];
      const invoiceStatus = ["paid", "paid", "paid", "sent", "overdue"][Math.floor(Math.random() * 5)];
      const totalAmount = plan.pricing?.monthly || 0;
      const issuedAt = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issuedAt.getTime() + (invoiceStatus === "overdue" ? -5 : 15) * 24 * 60 * 60 * 1000);
      const paidAt = invoiceStatus === "paid" ? new Date(issuedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null;

      const invoice = new Invoice({
        invoiceNumber: generateInvoiceNumber(),
        storeId: store._id,
        subscriptionId: sub._id,
        planId: plan._id,
        items: [
          {
            description: `Plan: ${plan.name} (${plan.slug})`,
            quantity: 1,
            unitPrice: totalAmount,
            total: totalAmount,
          },
        ],
        subtotal: totalAmount,
        tax: 0,
        total: totalAmount,
        currency: plan.pricing?.currency || "USD",
        status: invoiceStatus,
        paidAt,
        dueDate,
        issuedAt,
      });
      invoices.push(invoice);
    }

    const createdInvoices = await Invoice.insertMany(invoices);
    console.log(`Created ${createdInvoices.length} invoices`);

    const payments = [];
    for (let i = 0; i < createdInvoices.length; i++) {
      const invoice = createdInvoices[i];
      const sub = createdSubscriptions.find((s) => s._id.equals(invoice.subscriptionId));
      const plan = plans.find((p) => p._id.equals(sub.planId));
      const store = stores[i % stores.length];
      const isSuccessful = invoice.status === "paid" || Math.random() > 0.2;
      const status = isSuccessful ? "succeeded" : ["pending", "failed", "refunded"][Math.floor(Math.random() * 3)];
      const paidAt = status === "succeeded" ? new Date(invoice.issuedAt.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) : null;

      const payment = new Payment({
        storeId: store._id,
        subscriptionId: sub._id,
        invoiceId: invoice._id,
        amount: invoice.total,
        currency: invoice.currency,
        method: ["stripe", "paypal", "bank_transfer", "credit_card"][Math.floor(Math.random() * 4)],
        status,
        transactionId: generateTransactionId(),
        paidAt,
        meta: {
          source: "stripe",
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          planName: plan.name,
        },
      });
      payments.push(payment);
    }

    await Payment.insertMany(payments);
    console.log(`Created ${payments.length} payments`);

    await Promise.all(
      payments.map((payment) =>
        Invoice.findByIdAndUpdate(payment.invoiceId, {
          paymentId: payment._id,
          ...(payment.status === "succeeded" ? { paidAt: payment.paidAt } : {}),
        })
      )
    );
    console.log("Linked payments to invoices");

    console.log("\n=== Subscriptions Seed Data Summary ===");
    console.log(`Subscriptions: ${createdSubscriptions.length}`);
    console.log(`Invoices: ${createdInvoices.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log("\nDone!");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error seeding subscriptions data:", err);
    process.exit(1);
  }
};

seedSubscriptions();