import { describe, expect, it } from "vitest";
import {
  applyDefaults,
  applyMapping,
  detectColumns,
  fieldLabel,
  loadNameIndex,
  readRow,
  suggestField,
  validateMapping,
} from "./useProductFilter";

// Step 2 of the import: the mapping screen. Auto-detection only pre-fills the
// table  the user confirms it before anything is imported.
describe("suggestField", () => {
  it("matches headers regardless of case, spaces and accents", () => {
    expect(suggestField("Product Name")).toBe("productName");
    expect(suggestField("SKU")).toBe("sku");
    expect(suggestField("Prix")).toBe("regularPrice");
    expect(suggestField("Quantité")).toBe("stockQuantity");
  });

  it("strips the BOM Excel writes on the first header", () => {
    expect(suggestField("éproductName")).toBe("productName");
  });

  it("leaves an unrecognised header unmapped so the user picks a field", () => {
    expect(suggestField("Supplier Ref")).toBe("");
  });

  it("leaves database-owned columns unmapped", () => {
    expect(suggestField("createdAt")).toBe("");
    expect(suggestField("updatedAt")).toBe("");
  });
});

describe("detectColumns", () => {
  const rows = [
    { "Product Name": "Brake pad", SKU: "", Brand: "Bosch" },
    { "Product Name": "Filter", SKU: "F-1", Brand: "" },
  ];

  it("lists every column with its auto-detected field", () => {
    const columns = detectColumns(rows);

    expect(columns.map((c) => c.header)).toEqual([
      "Product Name",
      "SKU",
      "Brand",
    ]);
    expect(columns.map((c) => c.field)).toEqual([
      "productName",
      "sku",
      "brand",
    ]);
  });

  it("shows the first non-empty value as the example", () => {
    const columns = detectColumns(rows);
    // SKU is blank on the first row, so the example comes from the second
    expect(columns.find((c) => c.header === "SKU").sample).toBe("F-1");
    expect(columns.find((c) => c.header === "Brand").sample).toBe("Bosch");
  });

  it("picks up a column that only appears on a later row", () => {
    const columns = detectColumns([{ Name: "A" }, { Name: "B", Price: "10" }]);
    expect(columns.map((c) => c.header)).toContain("Price");
  });
});

describe("applyMapping", () => {
  it("uses the confirmed mapping, not the auto-detected one", () => {
    // the user re-pointed "Price" at the sale price instead
    const columns = [
      { header: "Product Name", field: "productName" },
      { header: "Price", field: "salePrice" },
    ];

    expect(applyMapping({ "Product Name": "Brake pad", Price: "9" }, columns)).toEqual(
      { productName: "Brake pad", salePrice: "9" }
    );
  });

  it("drops columns the user set to ignore", () => {
    const columns = [
      { header: "Product Name", field: "productName" },
      { header: "Supplier Ref", field: "" },
    ];

    const mapped = applyMapping(
      { "Product Name": "Brake pad", "Supplier Ref": "X1" },
      columns
    );

    expect(mapped).toEqual({ productName: "Brake pad" });
  });
});

describe("validateMapping", () => {
  it("refuses a mapping with no name column", () => {
    const errors = validateMapping([{ header: "SKU", field: "sku" }]);
    expect(errors).toContain("One column must be mapped to Name before importing.");
  });

  it("refuses two columns pointed at the same field", () => {
    const errors = validateMapping([
      { header: "Name", field: "productName" },
      { header: "Price", field: "regularPrice" },
      { header: "Prix", field: "regularPrice" },
    ]);

    expect(errors).toContain(
      '"Price" and "Prix" are both mapped to Regular price.'
    );
  });

  it("accepts a mapping with a name and no clashes", () => {
    expect(
      validateMapping([
        { header: "Name", field: "productName" },
        { header: "SKU", field: "sku" },
        { header: "Supplier Ref", field: "" },
      ])
    ).toEqual([]);
  });

  it("does not treat several ignored columns as a clash", () => {
    expect(
      validateMapping([
        { header: "Name", field: "productName" },
        { header: "A", field: "" },
        { header: "B", field: "" },
      ])
    ).toEqual([]);
  });
});

describe("fieldLabel", () => {
  it("names a field for the report and the mapping screen", () => {
    expect(fieldLabel("regularPrice")).toBe("Regular price");
  });

  it("calls an unmapped column ignored", () => {
    expect(fieldLabel("")).toBe("Ignore");
  });
});

// A failed category/brand lookup must not abort the whole import: it returns an
// empty index with ok:false so only the rows that reference it are skipped.
describe("loadNameIndex", () => {
  const category = { _id: "c1", name: "Brakes" };

  it("indexes a plain array by lowercased name", async () => {
    const res = await loadNameIndex(async () => [category], (r) => r.list);
    expect(res.ok).toBe(true);
    expect(res.index.get("brakes")).toBe("c1");
  });

  it("reads the list out of a paginated response", async () => {
    const res = await loadNameIndex(
      async () => ({ categories: [category], totalDoc: 1 }),
      (r) => r?.categories
    );
    expect(res.ok).toBe(true);
    expect(res.index.get("brakes")).toBe("c1");
  });

  it("does not throw when the loader rejects  reports ok:false instead", async () => {
    const res = await loadNameIndex(
      async () => {
        const err = new Error("network");
        err.response = { data: { message: "Accès refusé, token manquant" } };
        throw err;
      },
      (r) => r?.brands
    );

    expect(res.ok).toBe(false);
    expect(res.index.size).toBe(0);
    expect(res.error).toBe("Accès refusé, token manquant");
  });

  it("treats an unexpected shape as a failure rather than an empty catalog", async () => {
    const res = await loadNameIndex(
      async () => ({ success: false, message: "nope" }),
      (r) => r?.brands
    );
    expect(res.ok).toBe(false);
    expect(res.index.size).toBe(0);
  });
});

// Step 4: blanket defaults fill in fields the file has no column for.
describe("applyDefaults", () => {
  it("fills a missing field from the default", () => {
    const product = applyDefaults(
      { productName: "Brake pad" },
      { status: "draft" }
    );
    expect(product.status).toBe("draft");
  });

  it("never overwrites a value the row already carries", () => {
    const product = applyDefaults(
      { productName: "Brake pad", status: "published" },
      { status: "draft" }
    );
    expect(product.status).toBe("published");
  });

  it("skips a default left on the empty option", () => {
    const product = applyDefaults(
      { productName: "Brake pad" },
      { status: "" }
    );
    expect("status" in product).toBe(false);
  });

  it("converts a yes/no default into a real boolean", () => {
    const product = applyDefaults(
      { productName: "Brake pad" },
      { manageStock: "true", soldIndividually: "false" }
    );
    expect(product.manageStock).toBe(true);
    expect(product.soldIndividually).toBe(false);
  });

  it("leaves the original product untouched", () => {
    const original = { productName: "Brake pad" };
    applyDefaults(original, { status: "draft" });
    expect("status" in original).toBe(false);
  });
});

// Step 4: a cell that cannot be read is an error, never a silent default.
describe("readRow", () => {
  it("requires a product name", () => {
    const { errors } = readRow({ sku: "BP-1" }, 2);
    expect(errors).toContain("productName is required");
  });

  it("reports a non-numeric price rather than importing zero", () => {
    const { product, errors } = readRow(
      { productName: "Brake pad", regularPrice: "twenty" },
      2
    );

    expect(errors).toEqual(['regularPrice "twenty" is not a number']);
    expect(product.regularPrice).toBeUndefined();
  });

  it("accepts a comma decimal separator", () => {
    const { product, errors } = readRow(
      { productName: "Brake pad", regularPrice: "19,99" },
      2
    );

    expect(errors).toEqual([]);
    expect(product.regularPrice).toBe(19.99);
  });

  it("rejects an unknown enum value instead of falling back to the default", () => {
    const { product, errors } = readRow(
      { productName: "Brake pad", status: "publish" },
      2
    );

    expect(errors[0]).toMatch(/^status "publish" must be one of: /);
    expect(product.status).toBeUndefined();
  });

  it("flags a sale price above the regular price", () => {
    const { errors } = readRow(
      { productName: "Brake pad", regularPrice: "10", salePrice: "15" },
      2
    );

    expect(errors).toContain("salePrice cannot be greater than regularPrice");
  });

  it("rejects a zero dimension, which the model would refuse anyway", () => {
    const { errors } = readRow({ productName: "Brake pad", length: "0" }, 2);
    expect(errors).toContain("length must be greater than 0");
  });

  it("splits a multi-category cell the way the export writes it", () => {
    const { product } = readRow(
      { productName: "Brake pad", category: "Brakes | Filters" },
      2
    );

    expect(product.categoryNames).toEqual(["Brakes", "Filters"]);
  });

  it("keeps the main image separate from the rest of the gallery", () => {
    const { product } = readRow(
      {
        productName: "Brake pad",
        image: "main.png",
        images: "a.png | b.png",
      },
      2
    );

    expect(product.productImage).toBe("main.png");
    expect(product.productGallery).toEqual(["a.png", "b.png"]);
  });

  it("omits blank cells so the existing value is kept on update", () => {
    const { product } = readRow(
      { productName: "Brake pad", regularPrice: "", status: "  " },
      2
    );

    expect("regularPrice" in product).toBe(false);
    expect("status" in product).toBe(false);
  });

  it("reads yes/no columns in both languages", () => {
    const { product, errors } = readRow(
      { productName: "Brake pad", manageStock: "oui", virtual: "FALSE" },
      2
    );

    expect(errors).toEqual([]);
    expect(product.manageStock).toBe(true);
    expect(product.virtual).toBe(false);
  });

  it("carries the file line through so the report can point at it", () => {
    const { line } = readRow({ productName: "Brake pad" }, 7);
    expect(line).toBe(7);
  });
});

// The two steps together: what the user confirms is what gets validated.
describe("mapping into row reading", () => {
  it("routes a renamed column into the field the user chose", () => {
    const raw = { Titre: "Plaquette", Qty: "4" };
    const columns = [
      { header: "Titre", field: "productName" },
      { header: "Qty", field: "stockQuantity" },
    ];

    const { product, errors } = readRow(applyMapping(raw, columns), 2);

    expect(errors).toEqual([]);
    expect(product.productName).toBe("Plaquette");
    expect(product.stockQuantity).toBe(4);
  });
});
