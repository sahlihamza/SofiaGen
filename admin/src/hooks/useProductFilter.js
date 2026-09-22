/* eslint-disable react-hooks/exhaustive-deps */
import csvToJson from "csvtojson";
import { useContext, useState } from "react";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import ProductServices from "@/services/ProductServices";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import BrandServices from "@/services/BrandServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useDisableForDemo from "./useDisableForDemo";

// Product import pipeline. Each stage below maps to one step of the flow:
//
//   select file -> validate file -> map columns -> read rows
//   -> validate rows -> resolve refs -> POST (upsert by SKU) -> report
//
// Nothing is sent until every row has been checked. Rows that cannot be
// imported are collected with their spreadsheet line number and surfaced in the
// final report rather than aborting the run.

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

// Values that may hold several entries in one cell use this separator, matching
// what formatProductsForExport writes for multi-category products.
const MULTI_SEPARATOR = "|";

// ---- Step 2: column mapping ----------------------------------------------
// Headers are matched loosely (case, accents, spaces and underscores ignored)
// so a file edited in Excel or translated to French still lines up. The key is
// the normalized header, the value is the canonical column name.
const COLUMN_ALIASES = {
  productname: "productName",
  name: "productName",
  title: "productName",
  nomduproduit: "productName",
  nom: "productName",
  sku: "sku",
  reference: "sku",
  producttype: "productType",
  type: "productType",
  status: "status",
  statut: "status",
  visibility: "visibility",
  visibilite: "visibility",
  category: "category",
  categories: "category",
  categorie: "category",
  productcategory: "category",
  brand: "brand",
  marque: "brand",
  regularprice: "regularPrice",
  price: "regularPrice",
  prix: "regularPrice",
  prixregulier: "regularPrice",
  saleprice: "salePrice",
  prixpromo: "salePrice",
  managestock: "manageStock",
  gestionstock: "manageStock",
  stockstatus: "stockStatus",
  etatstock: "stockStatus",
  stockquantity: "stockQuantity",
  quantity: "stockQuantity",
  quantite: "stockQuantity",
  stock: "stockQuantity",
  lowstockthreshold: "lowStockThreshold",
  seuilstockbas: "lowStockThreshold",
  allowbackorders: "allowBackorders",
  soldindividually: "soldIndividually",
  weight: "weight",
  poids: "weight",
  length: "length",
  longueur: "length",
  width: "width",
  largeur: "width",
  height: "height",
  hauteur: "height",
  shippingclass: "shippingClass",
  classelivraison: "shippingClass",
  taxstatus: "taxStatus",
  taxclass: "taxClass",
  virtual: "virtual",
  virtuel: "virtual",
  downloadable: "downloadable",
  telechargeable: "downloadable",
  menuorder: "menuOrder",
  publishdate: "publishDate",
  datepublication: "publishDate",
  image: "image",
  mainimage: "image",
  imageprincipale: "image",
  images: "images",
  gallery: "images",
  galerie: "images",
  shortdescription: "shortDescription",
  descriptioncourte: "shortDescription",
  description: "description",
};

// Columns the export writes back out but that must never be imported: they are
// owned by the database.
const IGNORED_COLUMNS = new Set(["createdat", "updatedat", "id", "_id", "v"]);

const normalizeHeader = (header) =>
  String(header ?? "")
    .replace(/^\uFEFF/, "") // Excel writes a BOM on the first header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_()-]+/g, "");

// Enum values mirror backend/src/models/Product.js.
const ENUMS = {
  productType: ["simple", "variable", "grouped", "external"],
  status: ["draft", "published", "archived"],
  visibility: ["public", "private", "hidden"],
  stockStatus: ["instock", "outofstock", "onbackorder"],
  allowBackorders: ["no", "notify", "yes"],
  shippingClass: ["standard", "leger", "volumineux", "fragile"],
  taxStatus: ["taxable", "shipping", "none"],
  taxClass: ["standard", "reduced_rate", "zero_rate"],
};

const isBlank = (v) => String(v ?? "").trim() === "";

const str = (v) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};

// Split a multi-value cell ("Brakes | Filters") into trimmed entries.
const splitMulti = (v) =>
  String(v ?? "")
    .split(MULTI_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);

// Mongoose only applies a field default when the key is absent, so undefined
// entries are stripped rather than sent explicitly as null.
const compact = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// Category and brand are ObjectId refs but the export writes their display
// names, so importing has to translate names back into ids. Matching is
// case-insensitive.
const buildNameIndex = (list = []) => {
  const index = new Map();
  list.forEach((item) => {
    const name = typeof item?.name === "string" ? item.name : item?.name?.en;
    if (name && item?._id) index.set(name.trim().toLowerCase(), item._id);
  });
  return index;
};

// Load a name -> id index without letting a failure abort the whole import.
// /brands in particular requires auth; an expired token used to reject the
// Promise.all and kill the run before a single product was saved, with only a
// toast to show for it. On failure here the index is empty and `ok` is false,
// so only the rows that actually reference that list are skipped (with a clear
// reason) while every other row still imports.
export const loadNameIndex = async (loader, pick) => {
  try {
    const res = await loader();
    const list = Array.isArray(res) ? res : pick(res);
    if (!Array.isArray(list)) {
      return { index: new Map(), ok: false, error: "unexpected response" };
    }
    return { index: buildNameIndex(list), ok: true, error: null };
  } catch (err) {
    return {
      index: new Map(),
      ok: false,
      error: err?.response?.data?.message || err?.message || "request failed",
    };
  }
};

// ---- Step 2: column mapping ----------------------------------------------
// The fields a CSV column can be pointed at, in the order the mapping screen
// lists them. An empty value means "ignore this column".
export const IMPORT_FIELDS = [
  { value: "productName", label: "Name" },
  { value: "sku", label: "SKU" },
  { value: "description", label: "Description" },
  { value: "shortDescription", label: "Short description" },
  { value: "category", label: "Categories" },
  { value: "brand", label: "Brand" },
  { value: "productType", label: "Product type" },
  { value: "status", label: "Status" },
  { value: "visibility", label: "Visibility" },
  { value: "regularPrice", label: "Regular price" },
  { value: "salePrice", label: "Sale price" },
  { value: "manageStock", label: "Manage stock" },
  { value: "stockStatus", label: "Stock status" },
  { value: "stockQuantity", label: "Stock quantity" },
  { value: "lowStockThreshold", label: "Low stock threshold" },
  { value: "allowBackorders", label: "Backorders" },
  { value: "soldIndividually", label: "Sold individually" },
  { value: "weight", label: "Weight" },
  { value: "length", label: "Length" },
  { value: "width", label: "Width" },
  { value: "height", label: "Height" },
  { value: "shippingClass", label: "Shipping class" },
  { value: "taxStatus", label: "Tax status" },
  { value: "taxClass", label: "Tax class" },
  { value: "virtual", label: "Virtual" },
  { value: "downloadable", label: "Downloadable" },
  { value: "menuOrder", label: "Menu order" },
  { value: "publishDate", label: "Publish date" },
  { value: "image", label: "Main image" },
  { value: "images", label: "Images (gallery)" },
];

const FIELD_LABELS = new Map(IMPORT_FIELDS.map((f) => [f.value, f.label]));

export const fieldLabel = (value) => FIELD_LABELS.get(value) || "Ignore";

// ---- Step 4: default values for fields with no column -----------------------
// For a field the file has no column for, the user can pick one value that is
// applied to every imported row. Only offered for the small-choice fields
// (enums and yes/no) where a blanket default is meaningful. A column mapped to
// the field always wins, so the mapping screen hides a field's default once it
// is mapped.
const asOptions = (values) => values.map((v) => ({ value: v, label: v }));
const YES_NO = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export const DEFAULTABLE_FIELDS = [
  { value: "status", label: "Status", options: asOptions(ENUMS.status) },
  { value: "visibility", label: "Visibility", options: asOptions(ENUMS.visibility) },
  { value: "productType", label: "Product type", options: asOptions(ENUMS.productType) },
  { value: "stockStatus", label: "Stock status", options: asOptions(ENUMS.stockStatus) },
  { value: "allowBackorders", label: "Backorders", options: asOptions(ENUMS.allowBackorders) },
  { value: "shippingClass", label: "Shipping class", options: asOptions(ENUMS.shippingClass) },
  { value: "taxStatus", label: "Tax status", options: asOptions(ENUMS.taxStatus) },
  { value: "taxClass", label: "Tax class", options: asOptions(ENUMS.taxClass) },
  { value: "manageStock", label: "Manage stock", options: YES_NO },
  { value: "soldIndividually", label: "Sold individually", options: YES_NO },
];

// Boolean defaults come from the dropdown as "true"/"false" and are converted
// back to real booleans when applied.
const BOOLEAN_DEFAULT_FIELDS = new Set(["manageStock", "soldIndividually"]);

// Fill in a product's missing fields from the chosen defaults. A value the row
// already carries is never overwritten, and a default left on "" is skipped.
export const applyDefaults = (product, defaults = {}) => {
  const out = { ...product };
  Object.entries(defaults).forEach(([field, raw]) => {
    if (raw === "" || raw == null) return;
    if (out[field] !== undefined) return;
    out[field] = BOOLEAN_DEFAULT_FIELDS.has(field) ? raw === "true" : raw;
  });
  return out;
};

// Best guess for a header, used to pre-fill the mapping screen. "" means the
// header was not recognised and the column starts out ignored.
export const suggestField = (header) => {
  const key = normalizeHeader(header);
  if (!key || IGNORED_COLUMNS.has(key)) return "";
  return COLUMN_ALIASES[key] || "";
};

// First value that is actually filled in for a column, so the mapping screen
// can show the user what the column really holds rather than an empty cell.
const sampleValue = (rows, header) => {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const raw = rows[i]?.[header];
    if (!isBlank(raw)) return String(raw).trim();
  }
  return "";
};

// Build the mapping table: one entry per column found in the file, with the
// sample value and the auto-detected target field the user can override.
export const detectColumns = (rows = []) => {
  const headers = new Set();
  rows.slice(0, 20).forEach((row) => {
    Object.keys(row || {}).forEach((h) => headers.add(h));
  });

  return [...headers].map((header) => ({
    header,
    sample: sampleValue(rows, header),
    field: suggestField(header),
  }));
};

// Apply the confirmed mapping to one raw row, producing a canonical row that
// readRow can validate. Columns mapped to "" are dropped.
export const applyMapping = (rawRow, columns = []) => {
  const mapped = {};
  columns.forEach(({ header, field }) => {
    if (!field) return;
    const value = rawRow?.[header];
    // first column wins if two are pointed at the same field
    if (mapped[field] === undefined) mapped[field] = value;
  });
  return mapped;
};

// A mapping is usable once a name column is set and no field is claimed twice.
export const validateMapping = (columns = []) => {
  const errors = [];
  const used = columns.filter((c) => c.field);

  if (!used.some((c) => c.field === "productName")) {
    errors.push("One column must be mapped to Name before importing.");
  }

  const seen = new Map();
  used.forEach(({ header, field }) => {
    if (seen.has(field)) {
      errors.push(
        `"${seen.get(field)}" and "${header}" are both mapped to ${fieldLabel(field)}.`
      );
    } else {
      seen.set(field, header);
    }
  });

  return errors;
};

// ---- Step 4: validate and type one row -----------------------------------
// Returns { line, product, errors }. A cell that cannot be read is an error
// rather than a silent fallback, otherwise a typo would import as a default.
export const readRow = (row, line) => {
  const errors = [];

  const num = (key, { positive = false } = {}) => {
    const raw = row[key];
    if (isBlank(raw)) return undefined;
    const n = Number(String(raw).trim().replace(",", "."));
    if (!Number.isFinite(n)) {
      errors.push(`${key} "${String(raw).trim()}" is not a number`);
      return undefined;
    }
    if (positive && n <= 0) {
      errors.push(`${key} must be greater than 0`);
      return undefined;
    }
    if (!positive && n < 0) {
      errors.push(`${key} cannot be negative`);
      return undefined;
    }
    return n;
  };

  const bool = (key) => {
    const raw = row[key];
    if (isBlank(raw)) return undefined;
    const s = String(raw).trim().toLowerCase();
    if (["true", "1", "yes", "oui", "vrai"].includes(s)) return true;
    if (["false", "0", "no", "non", "faux"].includes(s)) return false;
    errors.push(`${key} "${raw}" is not a yes/no value`);
    return undefined;
  };

  const enumeration = (key) => {
    const raw = row[key];
    if (isBlank(raw)) return undefined;
    const s = String(raw).trim().toLowerCase();
    if (ENUMS[key].includes(s)) return s;
    errors.push(`${key} "${raw}" must be one of: ${ENUMS[key].join(", ")}`);
    return undefined;
  };

  const date = (key) => {
    const raw = str(row[key]);
    if (!raw) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      errors.push(`${key} "${raw}" is not a valid date`);
      return undefined;
    }
    return d.toISOString();
  };

  const productName = str(row.productName);
  if (!productName) errors.push("productName is required");

  const regularPrice = num("regularPrice");
  const salePrice = num("salePrice");
  if (
    regularPrice !== undefined &&
    salePrice !== undefined &&
    salePrice > regularPrice
  ) {
    errors.push("salePrice cannot be greater than regularPrice");
  }

  const dimensions = compact({
    length: num("length", { positive: true }),
    width: num("width", { positive: true }),
    height: num("height", { positive: true }),
  });

  const gallery = splitMulti(row.images);
  const image = str(row.image);

  const product = compact({
    productName,
    sku: str(row.sku),
    productType: enumeration("productType"),
    status: enumeration("status"),
    visibility: enumeration("visibility"),
    regularPrice,
    salePrice,
    manageStock: bool("manageStock"),
    stockStatus: enumeration("stockStatus"),
    stockQuantity: num("stockQuantity"),
    lowStockThreshold: num("lowStockThreshold"),
    allowBackorders: enumeration("allowBackorders"),
    soldIndividually: bool("soldIndividually"),
    weight: num("weight", { positive: true }),
    dimensions: Object.keys(dimensions).length ? dimensions : undefined,
    shippingClass: enumeration("shippingClass"),
    taxStatus: enumeration("taxStatus"),
    taxClass: enumeration("taxClass"),
    virtual: bool("virtual"),
    downloadable: bool("downloadable"),
    menuOrder: num("menuOrder"),
    publishDate: date("publishDate"),
    shortDescription: str(row.shortDescription),
    description: str(row.description),
    productImage: image,
    productGallery: gallery.length ? gallery : undefined,
    // resolved against the API in handleUploadMultiple
    categoryNames: splitMulti(row.category),
    brandName: str(row.brand),
  });

  return { line, product, errors };
};

const useProductFilter = (data) => {
  const { setLoading, setIsUpdate } = useContext(SidebarContext);

  // Rows exactly as the file holds them, keyed by its own header names. They
  // stay raw so the mapping can be changed and re-applied without re-reading
  // the file.
  const [rawRows, setRawRows] = useState([]);
  // [{ header, sample, field }]  the mapping table the user confirms.
  const [columns, setColumns] = useState([]);
  // Step 4: blanket values for fields the file has no column for, keyed by
  // product field, e.g. { status: "draft", manageStock: "true" }.
  const [defaults, setDefaults] = useState({});
  const [isMappingOpen, setMappingOpen] = useState(false);
  const [filename, setFileName] = useState("");
  const [isDisabled, setIsDisable] = useState(false);
  // Final report: { summary: {...}, rows: [{ line, productName, sku, action,
  // message }] }. Null while no import has run.
  const [importReport, setImportReport] = useState(null);

  const { handleDisableForDemo } = useDisableForDemo();

  //service data filtering
  const serviceData = data;

  // ---- Step 1: pick and validate the file --------------------------------
  const handleSelectFile = async (e) => {
    e.preventDefault();

    const file = e.target?.files?.[0];
    if (!file) return;

    setImportReport(null);
    setFileName(file.name);
    setIsDisable(true);

    const isJson =
      file.type === "application/json" || file.name?.toLowerCase().endsWith(".json");
    const isCsv =
      file.type === "text/csv" || file.name?.toLowerCase().endsWith(".csv");

    if (!isJson && !isCsv) {
      setRawRows([]);
      notifyError("Unsupported file type  pick a .csv or .json file.");
      return;
    }

    if (file.size === 0) {
      setRawRows([]);
      notifyError("The selected file is empty.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setRawRows([]);
      notifyError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The limit is 5 MB.`
      );
      return;
    }

    const fileReader = new FileReader();
    fileReader.onerror = () => notifyError("Could not read the selected file!");

    fileReader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = isJson
          ? JSON.parse(text)
          : await csvToJson().fromString(text);

        if (!Array.isArray(rows) || rows.length === 0) {
          setRawRows([]);
          notifyError("The selected file contains no rows!");
          return;
        }

        // Step 2: hand the detected columns to the mapping screen rather than
        // deciding here. Auto-detection only pre-fills it; the user confirms.
        setRawRows(rows);
        setColumns(detectColumns(rows));
        setMappingOpen(true);
      } catch (err) {
        setRawRows([]);
        notifyError(`Could not parse the file: ${err.message}`);
      }
    };

    fileReader.readAsText(file, "UTF-8");
  };

  // ---- Step 2: the mapping screen ----------------------------------------
  const setColumnField = (header, field) =>
    setColumns((prev) =>
      prev.map((c) => (c.header === header ? { ...c, field } : c))
    );

  const setDefaultValue = (field, value) =>
    setDefaults((prev) => ({ ...prev, [field]: value }));

  // Re-run auto-detection, discarding the user's overrides.
  const resetMapping = () => setColumns(detectColumns(rawRows));

  // Cancelling the mapping drops the file with it. Nothing stages the file
  // beside the Import button any more, so a file left loaded here would be
  // state no button can reach or clear; the next Import starts from scratch.
  const closeMapping = () => handleRemoveSelectFile();

  // Reopening after a first pass keeps whatever mapping was confirmed.
  const openMapping = () => {
    if (!rawRows.length) {
      notifyError("Please select a valid json or csv file first!");
      return;
    }
    setMappingOpen(true);
  };

  // ---- Steps 3 to 6: apply the mapping, validate, send, report -----------
  // Runs from the mapping screen, so the mapping the user confirmed is the one
  // that gets applied. Rows are only read here, never at file-select time.
  const handleUploadMultiple = async () => {
    if (handleDisableForDemo()) return;

    if (rawRows.length < 1) {
      notifyError("Please select a valid json or csv file first!");
      return;
    }

    const mappingErrors = validateMapping(columns);
    if (mappingErrors.length) {
      notifyError(mappingErrors[0]);
      return;
    }

    setLoading(true);
    setImportReport(null);
    setMappingOpen(false);

    // Steps 3 + 4: read and validate every row, keeping its file line so the
    // report can point back at it.
    const parsedRows = rawRows.map((raw, i) =>
      readRow(applyMapping(raw, columns), i + 2)
    );

    try {
      // Resolve category/brand names to ids. Each list is loaded on its own and
      // a failure never aborts the run (see loadNameIndex). getAllCategories,
      // not getShowingCategories, so an existing but inactive category is not
      // reported as unknown.
      const [categoryLookup, brandLookup] = await Promise.all([
        loadNameIndex(
          ProductCategoryServices.getAllCategories,
          (r) => r?.categories
        ),
        loadNameIndex(() => BrandServices.getAllBrands({}), (r) => r?.brands),
      ]);
      const categories = categoryLookup.index;
      const brands = brandLookup.index;

      // Shown at the top of the report and as a toast so a lookup failure is
      // never silent  this is what a missing/expired token looks like here.
      const notices = [];
      if (!categoryLookup.ok) {
        notices.push(
          `Categories could not be loaded (${categoryLookup.error})  rows with a category were skipped. Check that you are still signed in.`
        );
      }
      if (!brandLookup.ok) {
        notices.push(
          `Brands could not be loaded (${brandLookup.error})  rows with a brand were skipped. Check that you are still signed in.`
        );
      }
      notices.forEach((n) => notifyError(n));

      const payload = [];
      const rejected = [];

      // Only default the fields the file has no column for: a mapped column
      // always wins, and a default left on "" is ignored.
      const mappedFields = new Set(
        columns.filter((c) => c.field).map((c) => c.field)
      );
      const activeDefaults = Object.fromEntries(
        Object.entries(defaults).filter(
          ([field, value]) =>
            value !== "" && value != null && !mappedFields.has(field)
        )
      );

      parsedRows.forEach(({ line, product, errors }) => {
        const { categoryNames, brandName, ...rest } = product;
        const rowErrors = [...errors];

        const productCategories = [];
        (categoryNames || []).forEach((name) => {
          const id = categories.get(name.toLowerCase());
          if (id) productCategories.push(id);
          else if (categoryLookup.ok) rowErrors.push(`unknown category "${name}"`);
          else rowErrors.push(`could not verify category "${name}"`);
        });

        let brand;
        if (brandName) {
          brand = brands.get(brandName.toLowerCase());
          if (brand) {
            // resolved
          } else if (brandLookup.ok) {
            rowErrors.push(`unknown brand "${brandName}"`);
          } else {
            rowErrors.push(`could not verify brand "${brandName}"`);
          }
        }

        if (rowErrors.length) {
          rejected.push({
            line,
            productName: product.productName || "",
            sku: product.sku || "",
            action: "skipped",
            message: rowErrors.join("; "),
          });
          return;
        }

        payload.push(
          applyDefaults(
            compact({
              ...rest,
              productCategories: productCategories.length
                ? productCategories
                : undefined,
              brand,
            }),
            activeDefaults
          )
        );
      });

      if (payload.length === 0) {
        setLoading(false);
        setImportReport({
          notices,
          summary: {
            total: parsedRows.length,
            created: 0,
            updated: 0,
            skipped: rejected.length,
          },
          rows: rejected,
        });
        notifyError("No row could be imported  see the report for details.");
        return;
      }

      const res = await ProductServices.addAllProducts(payload);

      // The API reports per row too (unknown SKU collisions, validation the
      // client cannot do). Merge both sides into one report.
      const serverRows = Array.isArray(res?.results) ? res.results : [];
      setImportReport({
        notices,
        summary: {
          total: parsedRows.length,
          created: res?.created ?? 0,
          updated: res?.updated ?? 0,
          skipped: (res?.skipped ?? 0) + rejected.length,
        },
        rows: [...rejected, ...serverRows.filter((r) => r.action === "skipped")],
      });

      setIsUpdate(true);
      setLoading(false);
      notifySuccess(res?.message || "Import finished.");
    } catch (err) {
      setLoading(false);
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const handleRemoveSelectFile = () => {
    setFileName("");
    setRawRows([]);
    setColumns([]);
    setDefaults({});
    setMappingOpen(false);
    setImportReport(null);
    setTimeout(() => setIsDisable(false), 1000);
  };

  return {
    data,
    filename,
    isDisabled,
    handleSelectFile,
    serviceData,
    handleRemoveSelectFile,
    // the "Import" button reopens the mapping screen; the import itself is
    // started from there, once the mapping is confirmed
    handleUploadMultiple: openMapping,
    // column mapping screen
    isMappingOpen,
    columns,
    rowCount: rawRows.length,
    setColumnField,
    // step 4: blanket defaults for fields with no column
    defaults,
    setDefaultValue,
    resetMapping,
    closeMapping,
    runImport: handleUploadMultiple,
    mappingErrors: validateMapping(columns),
    // final report
    importReport,
    closeImportReport: () => setImportReport(null),
  };
};

export default useProductFilter;
