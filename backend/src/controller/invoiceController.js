const Invoice = require("../models/Invoice");
const Subscription = require("../models/Subscription");
const Plan = require("../models/Plan");
const Store = require("../models/Store");
const Payment = require("../models/Payment");
const User = require("../models/User");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { emitEvent } = require("../lib/eventBus");

const generateInvoiceNumber = async () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${timestamp}-${random}`;
};

const sanitizeFileName = (value) => {
  if (typeof value !== "string") return "invoice";
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100) || "invoice";
};

const createInvoice = async (req, res) => {
  try {
    const { subscriptionId, planId, storeId, items, tax = 0, currency = "USD", dueDate } = req.body;

    if (!subscriptionId || !planId || !storeId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: "subscriptionId, planId, storeId, and items are required" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + tax;

    const invoiceNumber = await generateInvoiceNumber();

    const invoice = new Invoice({
      invoiceNumber,
      storeId,
      subscriptionId,
      planId,
      items,
      subtotal,
      tax,
      total,
      currency,
      dueDate,
      status: "draft",
    });

    await invoice.save();

    await createSubscriptionEvent(
      subscription,
      "invoice_created",
      `Invoice ${invoiceNumber} created`,
      { invoiceId: invoice._id, invoiceNumber, total, currency },
      req.user?._id
    );

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("storeId", "name")
      .populate("subscriptionId", "status billingCycle")
      .populate("planId", "name slug");

    emitEvent("invoice.created", {
      storeId,
      entityId: invoice._id,
      metadata: { invoiceNumber },
      actionUrl: `/dashboard/invoices/${invoice._id}`,
    });

    res.status(201).json({ success: true, message: "Invoice created successfully", data: populatedInvoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "", storeId = "", search = "" } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (storeId) query.storeId = storeId;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { "storeId.name": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("storeId", "name")
      .populate("subscriptionId", "status billingCycle")
      .populate("planId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id)
      .populate("storeId", "name email")
      .populate("subscriptionId", "status billingCycle currentPeriodEnd")
      .populate("planId", "name slug pricing")
      .populate("paymentId", "amount currency status transactionId paidAt");

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, dueDate, items, tax, metadata } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    if (status) invoice.status = status;
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (items) invoice.items = items;
    if (tax !== undefined) invoice.tax = tax;
    if (metadata !== undefined) invoice.metadata = metadata;

    if (items) {
      invoice.subtotal = items.reduce((sum, item) => sum + item.total, 0);
      invoice.total = invoice.subtotal + (invoice.tax || 0);
    }

    if (status === "paid" && !invoice.paidAt) {
      invoice.paidAt = new Date();
    }

    await invoice.save();

    res.status(200).json({ success: true, message: "Invoice updated successfully", data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const linkPaymentToInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { paymentId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    invoice.paymentId = paymentId;
    invoice.status = "paid";
    invoice.paidAt = new Date();
    await invoice.save();

    payment.invoiceId = invoiceId;
    await payment.save();

    emitEvent("invoice.paid", {
      storeId: invoice.storeId,
      entityId: invoice._id,
      metadata: { invoiceNumber: invoice.invoiceNumber },
      actionUrl: `/dashboard/invoices/${invoice._id}`,
    });

    const subscription = await Subscription.findById(invoice.subscriptionId);
    if (subscription) {
      createSubscriptionEvent(
        subscription,
        "payment_succeeded",
        `Payment received for invoice ${invoice.invoiceNumber}`,
        { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber, amount: payment.amount, currency: payment.currency },
        req.user?._id
      );
      await subscription.save();
    }

    res.status(200).json({ success: true, message: "Payment linked to invoice successfully", data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getInvoicesByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const total = await Invoice.countDocuments({ storeId });
    const invoices = await Invoice.find({ storeId })
      .populate("planId", "name slug")
      .populate("subscriptionId", "status billingCycle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyInvoices = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await User.findById(userId).select("storeIds currentStoreId");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const storeId = user.currentStoreId || user.storeIds?.[0];
    if (!storeId) {
      return res.status(400).json({ success: false, message: "No store selected" });
    }
    const { page = 1, limit = 20, status = "" } = req.query;
    const skip = (page - 1) * limit;
    const query = { storeId };
    if (status) query.status = status;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("planId", "name slug")
      .populate("subscriptionId", "status billingCycle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: invoices,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSubscriptionEvent = (subscription, type, message, data, actor) => {
  subscription.events.push({
    type,
    message,
    data,
    actor,
    createdAt: new Date(),
  });
};

const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id)
      .populate("storeId", "name email address phone")
      .populate("subscriptionId", "status billingCycle")
      .populate("planId", "name slug pricing")
      .populate("paymentId", "amount currency status transactionId paidAt");

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const invoicesDir = path.join(__dirname, "../../invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const fileName = `${sanitizeFileName(invoice.invoiceNumber || invoice._id.toString())}.pdf`;
    const filePath = path.join(invoicesDir, fileName);

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(`Invoice Number: ${invoice.invoiceNumber || invoice._id}`);
      doc.text(`Status: ${invoice.status}`);
      doc.text(`Issued At: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "-"}`);
      doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}`);
      doc.moveDown();

      if (invoice.storeId) {
        doc.fontSize(14).font("Helvetica-Bold").text("Bill To");
        doc.fontSize(11).font("Helvetica").text(invoice.storeId.name || "-");
        if (invoice.storeId.email) doc.text(invoice.storeId.email);
        if (invoice.storeId.address) doc.text(invoice.storeId.address);
        if (invoice.storeId.phone) doc.text(invoice.storeId.phone);
        doc.moveDown();
      }

      if (invoice.planId) {
        doc.fontSize(14).font("Helvetica-Bold").text("Plan");
        doc.fontSize(11).font("Helvetica").text(invoice.planId.name || invoice.planId.slug || "-");
        doc.moveDown();
      }

      doc.fontSize(14).font("Helvetica-Bold").text("Details");
      doc.moveDown(0.5);
      doc.fontSize(11).font("Helvetica");
      const items = Array.isArray(invoice.items) ? invoice.items : [];
      if (items.length > 0) {
        items.forEach((item, index) => {
          doc.text(`${index + 1}. ${item.description || item.name || "Item"} - ${item.quantity || 1} x ${item.unitPrice || item.total || 0} = ${item.total || 0}`);
        });
      } else {
        doc.text(`Total: ${invoice.total || 0} ${invoice.currency || "USD"}`);
      }
      doc.moveDown();
      doc.fontSize(13).font("Helvetica-Bold").text(`Total: ${invoice.total || 0} ${invoice.currency || "USD"}`);

      doc.end();
    });

    fs.writeFileSync(filePath, pdfBuffer);

    res.status(200).json({
      success: true,
      message: "Invoice PDF generated successfully",
      data: {
        filePath: `/invoices/${fileName}`,
        fileName,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getMyInvoices,
  getInvoiceById,
  updateInvoice,
  linkPaymentToInvoice,
  getInvoicesByStore,
  generateInvoicePDF,
};