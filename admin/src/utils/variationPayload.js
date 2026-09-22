// Shared transform: local editable variation shape -> backend payload.
// Used both by the Variations editor (per-item save when updating a product)
// and by the product submit hook (bulk persist of variations generated while
// a brand-new product is being added, once it gets its id).

export const numOrNull = (x) => {
  if (x === "" || x == null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};

export const intOr0 = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// productId is optional here, but callers pass it even for the bulk endpoint
// (setProductVariations), which also carries it in the URL: a backend that
// requires the field on each variation would turn down the whole batch.
export const toVariationPayload = (v, productId) => ({
  productId,
  sku: (v.sku || "").trim(),
  barcode: (v.barcode || "").trim() || null,
  enabled: Boolean(v.enabled),
  attributes: v.attributes.map((a) => ({
    attributeId: a.attributeId,
    valueId: a.valueId,
  })),
  pricing: {
    regularPrice: numOrNull(v.regularPrice) ?? 0,
    salePrice: numOrNull(v.salePrice),
    costPrice: numOrNull(v.costPrice),
    saleStart: v.saleStart || null,
    saleEnd: v.saleEnd || null,
  },
  inventory: {
    manageStock: Boolean(v.manageStock),
    quantity: intOr0(v.quantity),
    reserved: intOr0(v.reserved),
    lowStockThreshold:
      v.lowStockThreshold === "" || v.lowStockThreshold == null
        ? undefined
        : Number(v.lowStockThreshold),
    allowBackorders: Boolean(v.allowBackorders),
  },
  shipping: {
    weight: numOrNull(v.weight),
    length: numOrNull(v.length),
    width: numOrNull(v.width),
    height: numOrNull(v.height),
    shippingClassId: v.shippingClassId || null,
  },
  tax: { status: v.taxStatus || "taxable" },
  images: v.image ? [v.image] : [],
});
