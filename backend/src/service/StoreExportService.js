const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");

// SO-16  store-owner data export (orders/customers/products), reusing the
// same generic async ExportJob pipeline already built for audit logs
// (AUDIT-EXPORT-1). Every query here is scoped by storeId  the exact bug
// class SO-02/SO-04 already burned this project on (a store owner seeing or
// exporting another store's rows), so storeId is required, never optional,
// and applied directly in the Mongo filter rather than trusted from a
// client-supplied param.

const toCsv = (headers, rows) =>
  [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");

const dateRangeFilter = (filters) => {
  const range = {};
  if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
  if (filters.dateTo) range.$lte = new Date(filters.dateTo);
  return Object.keys(range).length > 0 ? { createdAt: range } : {};
};

const buildExport = (filename, headers, rows, format) => {
  if (format === "json") {
    return { contentType: "application/json; charset=utf-8", filename: `${filename}.json`, data: JSON.stringify(rows, null, 2) };
  }
  const csvRows = rows.map((row) => headers.map((h) => row[h.key]));
  return {
    contentType: "text/csv; charset=utf-8",
    filename: `${filename}.csv`,
    data: toCsv(headers.map((h) => h.label), csvRows),
  };
};

const exportOrders = async (storeId, filters, format) => {
  if (!storeId) throw new Error("storeId is required");
  const query = { storeId, ...dateRangeFilter(filters) };
  if (filters.status) query.status = filters.status;

  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(50000).lean();
  const headers = [
    { key: "invoice", label: "Invoice" },
    { key: "status", label: "Status" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "subTotal", label: "Subtotal" },
    { key: "shippingCost", label: "Shipping" },
    { key: "discount", label: "Discount" },
    { key: "tax", label: "Tax" },
    { key: "total", label: "Total" },
    { key: "customerName", label: "Customer" },
    { key: "createdAt", label: "Created At" },
  ];
  const rows = orders.map((o) => ({
    invoice: o.invoice ?? o._id,
    status: o.status,
    paymentStatus: o.paymentStatus,
    subTotal: o.subTotal,
    shippingCost: o.shippingCost,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    customerName: o.user_info?.name || "",
    createdAt: o.createdAt,
  }));
  return buildExport(`orders-${Date.now()}`, headers, rows, format);
};

const exportCustomers = async (storeId, filters, format) => {
  if (!storeId) throw new Error("storeId is required");
  const query = { storeId, ...dateRangeFilter(filters) };

  const customers = await Customer.find(query).sort({ createdAt: -1 }).limit(50000).lean();
  const headers = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "phoneVerified", label: "Phone Verified" },
    { key: "marketingConsent", label: "Marketing Consent" },
    { key: "createdAt", label: "Created At" },
  ];
  const rows = customers.map((c) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phoneVerified: c.phoneVerified ? "yes" : "no",
    marketingConsent: c.marketingConsent ? "yes" : "no",
    createdAt: c.createdAt,
  }));
  return buildExport(`customers-${Date.now()}`, headers, rows, format);
};

const exportProducts = async (storeId, filters, format) => {
  if (!storeId) throw new Error("storeId is required");
  const query = { storeId, ...dateRangeFilter(filters) };
  if (filters.status) query.status = filters.status;

  const products = await Product.find(query).sort({ createdAt: -1 }).limit(50000).lean();
  const headers = [
    { key: "productName", label: "Product Name" },
    { key: "sku", label: "SKU" },
    { key: "regularPrice", label: "Price" },
    { key: "stockQuantity", label: "Stock" },
    { key: "stockStatus", label: "Stock Status" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Created At" },
  ];
  const rows = products.map((p) => ({
    productName: p.productName,
    sku: p.sku,
    regularPrice: p.regularPrice,
    stockQuantity: p.stockQuantity,
    stockStatus: p.stockStatus,
    status: p.status,
    createdAt: p.createdAt,
  }));
  return buildExport(`products-${Date.now()}`, headers, rows, format);
};

module.exports = { exportOrders, exportCustomers, exportProducts };
