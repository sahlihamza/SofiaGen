const PDFDocument = require("pdfkit");

// RFC 4180 minimum: wrap in quotes and double any embedded quote whenever
// the value contains a comma, quote, or newline. Small enough not to need a
// CSV library for this.
const escapeCsvField = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildCsv = (columns, rows) => {
  const header = columns.map((col) => escapeCsvField(col.label)).join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCsvField(row[col.key])).join(","));
  return [header, ...lines].join("\r\n");
};

// Per-report-type: which analytics response field holds the "natural" table
// to export, and which columns to show. Kept explicit (not auto-derived
// from whatever keys happen to exist on the response) so the export stays
// readable even as the underlying response shapes evolve.
const REPORT_DEFINITIONS = {
  dashboard: {
    columns: [
      { key: "metric", label: "Metric" },
      { key: "current", label: "Current" },
      { key: "previous", label: "Previous" },
      { key: "changePercent", label: "Change %" },
    ],
    rows: (data) =>
      Object.entries(data.metrics || {}).map(([metric, values]) => ({
        metric,
        current: values.current,
        previous: values.previous,
        changePercent: values.changePercent,
      })),
  },
  sales: {
    columns: [
      { key: "date", label: "Date" },
      { key: "grossSales", label: "Gross Sales" },
      { key: "netSales", label: "Net Sales" },
      { key: "totalSales", label: "Total Sales" },
      { key: "ordersCount", label: "Orders" },
      { key: "taxes", label: "Taxes" },
      { key: "shippingFees", label: "Shipping" },
      { key: "discounts", label: "Discounts" },
      { key: "productsSold", label: "Products Sold" },
    ],
    rows: (data) => data.series || [],
  },
  orders: {
    columns: [
      { key: "status", label: "Status" },
      { key: "label", label: "Label" },
      { key: "count", label: "Count" },
      { key: "percentage", label: "Percentage" },
    ],
    rows: (data) => data.breakdown || [],
  },
  customers: {
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "totalSpent", label: "Total Spent" },
      { key: "ordersCount", label: "Orders" },
    ],
    rows: (data) => data.topCustomers || [],
  },
  products: {
    columns: [
      { key: "title", label: "Product" },
      { key: "quantity", label: "Quantity Sold" },
      { key: "revenue", label: "Revenue" },
    ],
    rows: (data) => data.topSellingByRevenue || [],
  },
  categories: {
    columns: [
      { key: "name", label: "Category" },
      { key: "revenue", label: "Revenue" },
      { key: "distinctProductsSold", label: "Products Sold" },
      { key: "unitsSold", label: "Units Sold" },
    ],
    rows: (data) => data.categories || [],
  },
  coupons: {
    columns: [
      { key: "code", label: "Coupon Code" },
      { key: "usages", label: "Usages" },
      { key: "totalDiscount", label: "Total Discount" },
    ],
    rows: (data) => data.topCoupons || [],
  },
  revenue: {
    columns: [
      { key: "metric", label: "Metric" },
      { key: "current", label: "Current" },
      { key: "previous", label: "Previous" },
      { key: "changePercent", label: "Change %" },
    ],
    rows: (data) =>
      Object.entries(data.report || {}).map(([metric, values]) => ({
        metric,
        current: values.current,
        previous: values.previous,
        changePercent: values.changePercent,
      })),
  },
};

const REPORT_TYPES = Object.keys(REPORT_DEFINITIONS);

const getReportDefinition = (reportType) => {
  const definition = REPORT_DEFINITIONS[reportType];
  if (!definition) {
    const error = new Error(
      `reportType invalide : ${reportType} (valeurs acceptés : ${REPORT_TYPES.join(", ")})`
    );
    error.code = "INVALID_REPORT_TYPE";
    throw error;
  }
  return definition;
};

const buildCsvExport = (reportType, data) => {
  const definition = getReportDefinition(reportType);
  return buildCsv(definition.columns, definition.rows(data));
};

// Plain text/table layout via pdfkit (already a project dependency, used for
// order invoices  see src/lib/email-sender/create.js)  no new dependency.
const buildPdfExport = (reportType, data) => {
  const definition = getReportDefinition(reportType);
  const columns = definition.columns;
  const rows = definition.rows(data);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    doc.fontSize(16).font("Helvetica-Bold").text(`Rapport analytics : ${reportType}`);
    if (data.period) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .text(`Période : ${data.period.start}  ${data.period.end}`);
    }
    doc.moveDown();

    const startX = doc.page.margins.left;
    const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usableWidth / columns.length;
    let y = doc.y;

    const drawHeader = () => {
      doc.fontSize(9).font("Helvetica-Bold");
      columns.forEach((col, i) => {
        doc.text(col.label, startX + i * colWidth, y, { width: colWidth });
      });
      y += 16;
      doc
        .moveTo(startX, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .strokeColor("#aaaaaa")
        .stroke();
      y += 6;
      doc.font("Helvetica");
    };

    drawHeader();

    rows.forEach((row) => {
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }
      columns.forEach((col, i) => {
        const value = row[col.key];
        doc.text(value === null || value === undefined ? "" : String(value), startX + i * colWidth, y, {
          width: colWidth,
        });
      });
      y += 14;
    });

    if (rows.length === 0) {
      doc.fontSize(10).text("Aucune donné pour cette période.", startX, y);
    }

    doc.end();
  });
};

module.exports = { REPORT_TYPES, buildCsvExport, buildPdfExport };
