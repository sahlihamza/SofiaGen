import dayjs from "dayjs";

// Flatten raw product documents (as returned by the products API, with
// populated category / brand / gallery) into clean, flat rows suitable for a
// CSV or JSON export. Without this, nested objects (dimensions, populated
// refs) render as "[object Object]" in a spreadsheet and Mongo internals
// (_id, __v, virtuals) pollute the file.

// A populated ref exposes its label as a plain string or an i18n object.
const nameOf = (ref) => {
  if (!ref) return "";
  const n = ref.name ?? ref;
  if (typeof n === "string") return n;
  if (n && typeof n === "object") return n.en || n.fr || Object.values(n)[0] || "";
  return String(n);
};

// Decimal128 serializes as { $numberDecimal }, but keep this tolerant in case
// a price is sent that way; plain numbers pass straight through.
const num = (x) => {
  if (x == null || x === "") return "";
  if (typeof x === "object" && x.$numberDecimal != null) return Number(x.$numberDecimal);
  const n = Number(x);
  return Number.isFinite(n) ? n : "";
};

// Strip HTML and collapse whitespace so descriptions stay on a single CSV cell.
const text = (x) =>
  String(x ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const dateOnly = (d) => (d ? String(d).substring(0, 10) : "");

// The gallery holds either plain URLs (legacy) or GalleryProduct objects.
const galleryUrls = (p) =>
  (Array.isArray(p.productGallery) ? p.productGallery : [])
    .map((item) => (typeof item === "string" ? item : item?.image))
    .filter(Boolean);

const mainImage = (p) => p.productImage || galleryUrls(p)[0] || "";

// Everything after the main image, in one cell, so an exported file can be
// imported back with its gallery intact.
const extraImages = (p) => {
  const main = mainImage(p);
  return galleryUrls(p)
    .filter((url) => url !== main)
    .join(" | ");
};

// NOTE: attributes / variations / tags live in separate collections and are
// not part of the products payload, so they are not included here.
export const formatProductsForExport = (products = []) =>
  products.map((p) => ({
    productName: p.productName || "",
    sku: p.sku || "",
    productType: p.productType || "",
    status: p.status || "",
    visibility: p.visibility || "",
    // a product can sit in several categories; keep them in one cell so the
    // row stays flat, separated the same way tags would be
    category: Array.isArray(p.productCategories) && p.productCategories.length
      ? p.productCategories.map(nameOf).filter(Boolean).join(" | ")
      : nameOf(p.productCategory),
    brand: nameOf(p.brand),
    regularPrice: num(p.regularPrice),
    salePrice: num(p.salePrice),
    manageStock: Boolean(p.manageStock),
    stockStatus: p.stockStatus || "",
    stockQuantity: num(p.stockQuantity),
    lowStockThreshold: num(p.lowStockThreshold),
    allowBackorders: p.allowBackorders || "",
    soldIndividually: Boolean(p.soldIndividually),
    weight: num(p.weight),
    length: num(p.dimensions?.length),
    width: num(p.dimensions?.width),
    height: num(p.dimensions?.height),
    shippingClass: p.shippingClass || "",
    taxStatus: p.taxStatus || "",
    taxClass: p.taxClass || "",
    virtual: Boolean(p.virtual),
    downloadable: Boolean(p.downloadable),
    menuOrder: num(p.menuOrder),
    publishDate: dateOnly(p.publishDate),
    image: mainImage(p),
    images: extraImages(p),
    shortDescription: text(p.shortDescription),
    description: text(p.description),
    createdAt: p.createdAt || "",
    updatedAt: p.updatedAt || "",
  }));

// ---------------------------------------------------------------------------
// Configurable CSV export (WooCommerce-style "choose your columns" export).
// The modal lets the user pick which of these columns to write and in this
// order; the hook streams products through productToCsvRow with a progress
// bar. Kept separate from formatProductsForExport above, which the JSON export
// still uses as a single flat object.
// ---------------------------------------------------------------------------

// A product may sit in several categories; keep them in one readable cell.
const categoriesText = (p) =>
  Array.isArray(p.productCategories) && p.productCategories.length
    ? p.productCategories.map(nameOf).filter(Boolean).join(" | ")
    : nameOf(p.productCategory);

const yesNo = (b) => (b ? "yes" : "no");

// Attributes / variations / tags are stored in their own collections and are
// usually NOT part of the products list payload, so these read defensively and
// simply produce an empty cell when the data is absent. When a payload does
// carry them (e.g. a populated single product), they render in a readable,
// re-importable shape.
const attributesText = (p) => {
  const list = p.attributes || p.productAttributes;
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map((a) => {
      const name = nameOf(a?.name ?? a?.attribute ?? a);
      const raw = a?.values ?? a?.options ?? a?.value ?? [];
      const values = (Array.isArray(raw) ? raw : [raw])
        .map((v) => nameOf(v))
        .filter(Boolean)
        .join(", ");
      return values ? `${name}: ${values}` : name;
    })
    .filter(Boolean)
    .join(" | ");
};

const variationsText = (p) => {
  const list = p.variations || p.productVariations;
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map((v) => v?.sku || nameOf(v?.name) || (v?._id ? String(v._id) : ""))
    .filter(Boolean)
    .join(" | ");
};

const tagsText = (p) => {
  const list = p.tags || p.productTags;
  if (!Array.isArray(list) || !list.length) return "";
  return list
    .map((t) => (typeof t === "string" ? t : nameOf(t)))
    .filter(Boolean)
    .join(" | ");
};

// Every exportable column, in the order they are written. `group` only drives
// how the checkboxes are laid out in the modal. Labels double as the CSV header
// row and are chosen so the file round-trips through the product importer.
export const EXPORT_COLUMNS = [
  { key: "id", label: "ID", group: "Basic", accessor: (p) => p._id || "" },
  { key: "productName", label: "Name", group: "Basic", accessor: (p) => p.productName || "" },
  { key: "sku", label: "SKU", group: "Basic", accessor: (p) => p.sku || "" },
  { key: "productType", label: "Type", group: "Basic", accessor: (p) => p.productType || "" },
  { key: "status", label: "Status", group: "Basic", accessor: (p) => p.status || "" },
  { key: "visibility", label: "Visibility", group: "Basic", accessor: (p) => p.visibility || "" },
  { key: "category", label: "Categories", group: "Basic", accessor: categoriesText },
  { key: "brand", label: "Brand", group: "Basic", accessor: (p) => nameOf(p.brand) },

  { key: "regularPrice", label: "Regular price", group: "Pricing", accessor: (p) => num(p.regularPrice) },
  { key: "salePrice", label: "Sale price", group: "Pricing", accessor: (p) => num(p.salePrice) },
  { key: "taxStatus", label: "Tax status", group: "Pricing", accessor: (p) => p.taxStatus || "" },
  { key: "taxClass", label: "Tax class", group: "Pricing", accessor: (p) => p.taxClass || "" },

  { key: "manageStock", label: "Manage stock", group: "Inventory", accessor: (p) => yesNo(p.manageStock) },
  { key: "stockStatus", label: "Stock status", group: "Inventory", accessor: (p) => p.stockStatus || "" },
  { key: "stockQuantity", label: "Stock", group: "Inventory", accessor: (p) => num(p.stockQuantity) },
  { key: "lowStockThreshold", label: "Low stock threshold", group: "Inventory", accessor: (p) => num(p.lowStockThreshold) },
  { key: "allowBackorders", label: "Backorders", group: "Inventory", accessor: (p) => p.allowBackorders || "" },
  { key: "soldIndividually", label: "Sold individually", group: "Inventory", accessor: (p) => yesNo(p.soldIndividually) },

  { key: "weight", label: "Weight", group: "Shipping", accessor: (p) => num(p.weight) },
  { key: "length", label: "Length", group: "Shipping", accessor: (p) => num(p.dimensions?.length) },
  { key: "width", label: "Width", group: "Shipping", accessor: (p) => num(p.dimensions?.width) },
  { key: "height", label: "Height", group: "Shipping", accessor: (p) => num(p.dimensions?.height) },
  { key: "shippingClass", label: "Shipping class", group: "Shipping", accessor: (p) => p.shippingClass || "" },

  { key: "image", label: "Main image", group: "Images", accessor: (p) => mainImage(p) },
  { key: "images", label: "Images", group: "Images", accessor: (p) => extraImages(p) },

  { key: "attributes", label: "Attributes", group: "Attributes & variations", accessor: attributesText },
  { key: "variations", label: "Variations", group: "Attributes & variations", accessor: variationsText },
  { key: "tags", label: "Tags", group: "Attributes & variations", accessor: tagsText },

  { key: "shortDescription", label: "Short description", group: "Content", accessor: (p) => text(p.shortDescription) },
  { key: "description", label: "Description", group: "Content", accessor: (p) => text(p.description) },

  { key: "virtual", label: "Virtual", group: "Meta", accessor: (p) => yesNo(p.virtual) },
  { key: "downloadable", label: "Downloadable", group: "Meta", accessor: (p) => yesNo(p.downloadable) },
  { key: "menuOrder", label: "Menu order", group: "Meta", accessor: (p) => num(p.menuOrder) },
  { key: "publishDate", label: "Publish date", group: "Meta", accessor: (p) => dateOnly(p.publishDate) },
  { key: "createdAt", label: "Created at", group: "Meta", accessor: (p) => dateOnly(p.createdAt) },
  { key: "updatedAt", label: "Updated at", group: "Meta", accessor: (p) => dateOnly(p.updatedAt) },
];

const COLUMN_BY_KEY = new Map(EXPORT_COLUMNS.map((c) => [c.key, c]));

// Column keys grouped in display order, for the modal's checkbox layout.
export const EXPORT_COLUMN_GROUPS = EXPORT_COLUMNS.reduce((groups, col) => {
  const last = groups[groups.length - 1];
  if (last && last.group === col.group) last.columns.push(col);
  else groups.push({ group: col.group, columns: [col] });
  return groups;
}, []);

// The four product types WooCommerce exposes, used by the type filter.
export const PRODUCT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "simple", label: "Simple" },
  { value: "variable", label: "Variable" },
  { value: "grouped", label: "Grouped" },
  { value: "external", label: "External" },
];

// RFC 4180: a field is quoted only when it holds a comma, quote or newline, and
// inner quotes are doubled. Numbers and empty cells pass through untouched.
export const csvEscape = (value) => {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  if (s === "") return "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Header row for the chosen columns, in the chosen order.
export const buildCsvHeader = (columnKeys = []) =>
  columnKeys.map((k) => csvEscape(COLUMN_BY_KEY.get(k)?.label ?? k)).join(",");

// One CSV line for a product. Throws if a column accessor blows up so the
// caller can record which product failed and keep going.
export const productToCsvRow = (product, columnKeys = []) =>
  columnKeys
    .map((k) => {
      const col = COLUMN_BY_KEY.get(k);
      return csvEscape(col ? col.accessor(product) : "");
    })
    .join(",");

// products-export-2026-07-22_14-30-05.csv  date and time so repeated exports
// never overwrite each other in the downloads folder.
export const buildExportFileName = (prefix = "products-export", ext = "csv") =>
  `${prefix}-${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.${ext}`;

// Human-readable file size for the success screen.
export const formatBytes = (bytes) => {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / 1024 ** i;
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
