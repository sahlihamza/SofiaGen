const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
const Invoice = require("../models/Invoice");
const Store = require("../models/Store");
const Plan = require("../models/Plan");
const Subscription = require("../models/Subscription");

const OUTPUT_DIR = path.join(__dirname, "..", "..", "invoices");

const ensureOutputDir = () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
};

const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
};

const generatePDF = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate("storeId", "name email address")
    .populate("subscriptionId", "status billingCycle currentPeriodStart currentPeriodEnd")
    .populate("planId", "name slug pricing")
    .populate("paymentId", "amount currency status transactionId paidAt");

  if (!invoice) throw new Error("Invoice not found");

  ensureOutputDir();

  const filePath = path.join(OUTPUT_DIR, `invoice-${invoice.invoiceNumber}.pdf`);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(20).text("INVOICE", { align: "center" });
  doc.moveDown();

  doc.fontSize(10).text(`Invoice Number: ${invoice.invoiceNumber}`);
  doc.text(`Status: ${invoice.status.toUpperCase()}`);
  doc.text(`Issued: ${dayjs(invoice.issuedAt).format("DD/MM/YYYY")}`);
  doc.text(`Due Date: ${invoice.dueDate ? dayjs(invoice.dueDate).format("DD/MM/YYYY") : "N/A"}`);
  doc.moveDown();

  doc.fontSize(12).text("Bill To:", { underline: true });
  doc.fontSize(10);
  doc.text(invoice.storeId?.name || "Unknown Store");
  if (invoice.storeId?.email) doc.text(invoice.storeId.email);
  if (invoice.storeId?.address) doc.text(invoice.storeId.address);
  doc.moveDown();

  doc.fontSize(12).text("Subscription Details:", { underline: true });
  doc.fontSize(10);
  doc.text(`Plan: ${invoice.planId?.name || "N/A"}`);
  doc.text(`Subscription ID: ${invoice.subscriptionId?._id || "N/A"}`);
  doc.text(`Billing Cycle: ${invoice.subscriptionId?.billingCycle || "N/A"}`);
  doc.text(`Period: ${invoice.subscriptionId?.currentPeriodStart ? dayjs(invoice.subscriptionId.currentPeriodStart).format("DD/MM/YYYY") : "N/A"}  ${invoice.subscriptionId?.currentPeriodEnd ? dayjs(invoice.subscriptionId.currentPeriodEnd).format("DD/MM/YYYY") : "N/A"}`);
  doc.moveDown();

  const tableTop = doc.y;
  const itemWidth = 300;
  const qtyWidth = 60;
  const priceWidth = 80;
  const totalWidth = 440;

  doc.fontSize(9).text("Description", 50, tableTop);
  doc.text("Qty", 50 + itemWidth, tableTop);
  doc.text("Unit Price", 50 + itemWidth + qtyWidth, tableTop);
  doc.text("Total", 50 + itemWidth + qtyWidth + priceWidth, tableTop);

  doc.moveDown();
  doc.fontSize(10);

  let y = doc.y;
  for (const item of invoice.items || []) {
    doc.text(item.description, 50, y);
    doc.text(String(item.quantity), 50 + itemWidth, y);
    doc.text(formatCurrency(item.unitPrice, invoice.currency), 50 + itemWidth + qtyWidth, y);
    doc.text(formatCurrency(item.total, invoice.currency), 50 + itemWidth + qtyWidth + priceWidth, y);
    y += 20;
  }

  doc.moveDown(2);
  doc.fontSize(10);
  doc.text(`Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}`, { align: "right" });
  if (invoice.tax > 0) {
    doc.text(`Tax (${(invoice.taxRate || 0) * 100}%): ${formatCurrency(invoice.tax, invoice.currency)}`, { align: "right" });
  }
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text(`Total: ${formatCurrency(invoice.total, invoice.currency)}`, { align: "right" });

  if (invoice.discounts && invoice.discounts.length > 0) {
    doc.moveDown();
    doc.fontSize(10).font("Helvetica");
    for (const discount of invoice.discounts) {
      doc.text(`Discount (${discount.code}): -${formatCurrency(discount.discountAmount, invoice.currency)}`, { align: "right" });
    }
  }

  doc.moveDown(2);
  doc.fontSize(8).text("Thank you for your business!", { align: "center" });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};

const generateInvoicePDF = async (invoiceId) => {
  const filePath = await generatePDF(invoiceId);
  return {
    invoiceId,
    invoiceNumber: (await Invoice.findById(invoiceId)).invoiceNumber,
    filePath,
  };
};

const sendInvoiceEmail = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate("storeId", "name email")
    .populate("planId", "name");

  if (!invoice) throw new Error("Invoice not found");
  if (!invoice.storeId?.email) throw new Error("Store email not found");

  const filePath = await generatePDF(invoiceId);

  return {
    to: invoice.storeId.email,
    subject: `Invoice ${invoice.invoiceNumber}`,
    body: `Dear ${invoice.storeId.name},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total, invoice.currency)}.\n\nThank you.`,
    attachment: filePath,
  };
};

const getInvoiceByNumber = async (invoiceNumber) => {
  const invoice = await Invoice.findOne({ invoiceNumber })
    .populate("storeId", "name email")
    .populate("subscriptionId", "status billingCycle")
    .populate("planId", "name slug");
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
};

module.exports = {
  generateInvoicePDF,
  sendInvoiceEmail,
  getInvoiceByNumber,
  generatePDF,
};