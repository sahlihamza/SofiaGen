import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import combinate from "combinate";
import {
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiRefreshCw,
  FiSave,
} from "react-icons/fi";

//internal import
import AttributeValueServices from "@/services/AttributeValueServices";
import ProductVariationServices from "@/services/ProductVariationServices";
import ShippingClassServices from "@/services/ShippingClassServices";
import Uploader from "@/components/image-uploader/Uploader";
import { notifyError, notifySuccess } from "@/utils/toast";
import { numOrNull, toVariationPayload } from "@/utils/variationPayload";
import { W, wInput } from "./styles";
import { Button } from "@sofia/ui";

// ---- helpers -------------------------------------------------------------
const uid = () => `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const slugify = (v) =>
  String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Decimal128 fields serialize as { $numberDecimal: "10.50" } over JSON.
const toNum = (x) => {
  if (x == null || x === "") return "";
  if (typeof x === "object" && x.$numberDecimal != null) return x.$numberDecimal;
  return x;
};
const isoDate = (d) => (d ? String(d).substring(0, 10) : "");

// stable signature of an attribute combination, used to detect duplicates
// regardless of the order the attributes were listed in.
const signatureOf = (attrs = []) =>
  attrs
    .map((a) => `${a.attributeId}:${a.valueId}`)
    .sort()
    .join("|");

// backend variation document -> local editable shape
const fromServer = (v) => ({
  uid: v._id || uid(),
  _id: v._id || null,
  attributes: (v.attributes || []).map((a) => ({
    attributeId: a.attributeId?._id || a.attributeId,
    valueId: a.valueId?._id || a.valueId,
  })),
  enabled: v.enabled !== false,
  sku: v.sku || "",
  barcode: v.barcode || "",
  regularPrice: toNum(v.pricing?.regularPrice),
  salePrice: toNum(v.pricing?.salePrice),
  costPrice: toNum(v.pricing?.costPrice),
  saleStart: isoDate(v.pricing?.saleStart),
  saleEnd: isoDate(v.pricing?.saleEnd),
  manageStock: Boolean(v.inventory?.manageStock),
  quantity: v.inventory?.quantity ?? 0,
  reserved: v.inventory?.reserved ?? 0,
  lowStockThreshold: v.inventory?.lowStockThreshold ?? "",
  allowBackorders: Boolean(v.inventory?.allowBackorders),
  weight: toNum(v.shipping?.weight),
  length: toNum(v.shipping?.length),
  width: toNum(v.shipping?.width),
  height: toNum(v.shipping?.height),
  shippingClassId: v.shipping?.shippingClassId?._id || v.shipping?.shippingClassId || "",
  taxStatus: v.tax?.status || "taxable",
  image: Array.isArray(v.images) ? v.images[0] || "" : "",
});

// ---- small styled bits ---------------------------------------------------
const th = {
  padding: "10px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: W.textSecondary,
  whiteSpace: "nowrap",
};
const td = { padding: "10px 12px", fontSize: 13, color: W.text, verticalAlign: "top" };
const chipBtn = (on) => ({
  height: 28,
  padding: "0 10px",
  borderRadius: 14,
  border: `1px solid ${on ? W.primary : W.inputBorder}`,
  background: on ? "#e6f0f9" : "transparent",
  color: on ? W.primary : W.textSecondary,
  fontSize: 12,
  fontWeight: 500,
});
const smallLink = {
  fontSize: 12,
  fontWeight: 600,
  color: W.primary,
  textDecoration: "underline",
};

// One labelled control row inside the accordion editor.
const FieldRow = ({ label, required, requiredTitle, children }) => (
  <div className="flex items-start" style={{ marginBottom: 12 }}>
    <label
      style={{
        width: 150,
        minWidth: 150,
        fontSize: 13,
        fontWeight: 600,
        color: W.text,
        paddingTop: 8,
      }}
    >
      {label}
      {required && <RequiredMark title={requiredTitle} />}
    </label>
    <div style={{ flex: 1, maxWidth: 280 }}>{children}</div>
  </div>
);

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      color: W.text,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      margin: "18px 0 10px",
      paddingBottom: 6,
      borderBottom: `1px solid ${W.border}`,
    }}
  >
    {children}
  </div>
);

// ---- accordion editor for a single variation -----------------------------
const VariationEditor = ({ v, shippingClasses = [], onChange, onSave, onDelete, saving }) => {
  const { t } = useTranslation();
  const set = (patch) => onChange(patch);

  return (
    <div>
      {/* GENERAL */}
      <SectionTitle>{t("productForm.general")}</SectionTitle>
      <label
        className="flex items-center gap-2"
        style={{ fontSize: 13, color: W.text, marginBottom: 12 }}
      >
        <input
          type="checkbox"
          checked={v.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        {t("productForm.enabled")}
      </label>
      <FieldRow label={t("productForm.sku")}>
        <input
          style={wInput}
          value={v.sku}
          onChange={(e) => set({ sku: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.barcode")}>
        <input
          style={wInput}
          value={v.barcode}
          onChange={(e) => set({ barcode: e.target.value })}
        />
      </FieldRow>

      {/* PRICING */}
      <SectionTitle>{t("productForm.pricing")}</SectionTitle>
      <FieldRow
        label={t("productForm.regularPrice")}
        required
        requiredTitle={t("productForm.requiredField")}
      >
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.regularPrice}
          onChange={(e) => set({ regularPrice: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.salePrice")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.salePrice}
          onChange={(e) => set({ salePrice: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.costPrice")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.costPrice}
          onChange={(e) => set({ costPrice: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.saleStart")}>
        <input
          type="date"
          style={wInput}
          value={v.saleStart}
          onChange={(e) => set({ saleStart: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.saleEnd")}>
        <input
          type="date"
          style={wInput}
          value={v.saleEnd}
          onChange={(e) => set({ saleEnd: e.target.value })}
        />
      </FieldRow>

      {/* INVENTORY */}
      <SectionTitle>{t("productForm.inventory")}</SectionTitle>
      <label
        className="flex items-center gap-2"
        style={{ fontSize: 13, color: W.text, marginBottom: 12 }}
      >
        <input
          type="checkbox"
          checked={v.manageStock}
          onChange={(e) => set({ manageStock: e.target.checked })}
        />
        {t("productForm.manageStock")}
      </label>
      {v.manageStock && (
        <>
          <FieldRow label={t("productForm.quantity")}>
            <input
              type="number"
              style={wInput}
              value={v.quantity}
              onChange={(e) => set({ quantity: e.target.value })}
            />
          </FieldRow>
          <FieldRow label={t("productForm.reserved")}>
            <input
              type="number"
              style={wInput}
              value={v.reserved}
              onChange={(e) => set({ reserved: e.target.value })}
            />
          </FieldRow>
          <FieldRow label={t("productForm.lowStockThreshold")}>
            <input
              type="number"
              style={wInput}
              value={v.lowStockThreshold}
              onChange={(e) => set({ lowStockThreshold: e.target.value })}
            />
          </FieldRow>
        </>
      )}
      <label
        className="flex items-center gap-2"
        style={{ fontSize: 13, color: W.text }}
      >
        <input
          type="checkbox"
          checked={v.allowBackorders}
          onChange={(e) => set({ allowBackorders: e.target.checked })}
        />
        {t("productForm.allowBackorders")}
      </label>

      {/* SHIPPING */}
      <SectionTitle>{t("productForm.shipping")}</SectionTitle>
      <FieldRow label={t("productForm.weight")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.weight}
          onChange={(e) => set({ weight: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.length")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.length}
          onChange={(e) => set({ length: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.width")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.width}
          onChange={(e) => set({ width: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.height")}>
        <input
          type="number"
          step="0.01"
          style={wInput}
          value={v.height}
          onChange={(e) => set({ height: e.target.value })}
        />
      </FieldRow>
      <FieldRow label={t("productForm.shippingClass")}>
        <select
          style={wInput}
          value={v.shippingClassId || ""}
          onChange={(e) => set({ shippingClassId: e.target.value })}
        >
          <option value="">{t("productForm.sameAsParent")}</option>
          {shippingClasses.map((shippingClass) => (
            <option key={shippingClass._id} value={shippingClass._id}>
              {shippingClass.name}
            </option>
          ))}
        </select>
      </FieldRow>

      {/* TAX */}
      <SectionTitle>{t("productForm.tax")}</SectionTitle>
      <FieldRow label={t("productForm.taxStatus")}>
        <select
          style={wInput}
          value={v.taxStatus}
          onChange={(e) => set({ taxStatus: e.target.value })}
        >
          <option value="taxable">{t("productForm.taxable")}</option>
          <option value="none">{t("productForm.none")}</option>
        </select>
      </FieldRow>

      {/* MEDIA */}
      <SectionTitle>{t("productForm.media")}</SectionTitle>
      <div style={{ maxWidth: 320 }}>
        <Uploader
          folder="product"
          silentSuccess
          imageUrl={v.image}
          setImageUrl={(url) => set({ image: url })}
        />
      </div>

      {/* ACTIONS */}
      <div
        className="flex items-center gap-3"
        style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${W.border}` }}
      >
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2"
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 4,
            background: W.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <FiSave size={14} />
          {saving ? t("productForm.saving") : t("productForm.save")}
        </Button>
        <Button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-2"
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 4,
            border: `1px solid ${W.inputBorder}`,
            background: "transparent",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <FiTrash2 size={14} />
          {t("productForm.deleteVariation")}
        </Button>
      </div>
    </div>
  );
};

// ---- main component ------------------------------------------------------
// `variations` / `setVariations` are lifted to the product submit hook so that
// combinations generated while a brand-new product is being added can be
// buffered locally and persisted in one go once the product gets its id.
const Variations = ({
  currentId,
  attributes = [],
  watch,
  variations = [],
  setVariations,
}) => {
  const { t } = useTranslation();
  const productId = currentId || null;
  const productType = watch ? watch("productType") : "variable";

  // product attributes flagged "used for variations" (with a global attribute id)
  const variationAttributes = useMemo(
    () => (attributes || []).filter((a) => a.usedForVariations && a.attribute),
    [attributes]
  );

  const [termsByAttr, setTermsByAttr] = useState({}); // attributeId -> [AttributeValue]
  const [attrNameById, setAttrNameById] = useState({}); // attributeId -> name
  const [included, setIncluded] = useState({}); // attributeId -> bool
  const [selectedValues, setSelectedValues] = useState({}); // attributeId -> Set(valueId)

  const [expanded, setExpanded] = useState(() => new Set());
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [shippingClasses, setShippingClasses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ShippingClassServices.getAllShippingClasses();
        setShippingClasses(Array.isArray(res) ? res : res?.data || []);
      } catch {
        setShippingClasses([]);
      }
    })();
  }, []);

  // keep attribute names from the product-attribute blocks
  useEffect(() => {
    setAttrNameById((prev) => {
      const next = { ...prev };
      variationAttributes.forEach((a) => {
        if (a.attribute) next[a.attribute] = a.name || next[a.attribute] || "";
      });
      return next;
    });
  }, [variationAttributes]);

  // load the existing variations of the product. In add mode (no productId yet)
  // the list is owned by the submit hook and buffered locally, so we must not
  // clear it here â€” otherwise switching tabs would wipe generated variations.
  useEffect(() => {
    if (!productId) return;
    let alive = true;
    (async () => {
      try {
        const res =
          await ProductVariationServices.getVariationsByProduct(productId);
        const list = Array.isArray(res) ? res : res?.data || [];
        if (!alive) return;
        // capture populated attribute names for display
        const names = {};
        list.forEach((v) =>
          (v.attributes || []).forEach((a) => {
            const id = a.attributeId?._id || a.attributeId;
            const nm = a.attributeId?.name;
            if (id && nm) names[id] = nm;
          })
        );
        setAttrNameById((prev) => ({ ...prev, ...names }));
        setVariations(list.map(fromServer));
      } catch (err) {
        if (alive) notifyError(err?.response?.data?.message || err?.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  // fetch the AttributeValue terms for every attribute we need (variation
  // attributes + attributes referenced by existing variations)
  useEffect(() => {
    const ids = new Set();
    variationAttributes.forEach((a) => a.attribute && ids.add(a.attribute));
    variations.forEach((v) =>
      v.attributes.forEach((a) => a.attributeId && ids.add(a.attributeId))
    );
    const missing = [...ids].filter((id) => id && !termsByAttr[id]);
    if (!missing.length) return;

    let alive = true;
    (async () => {
      const updates = {};
      for (const id of missing) {
        try {
          const res = await AttributeValueServices.getValuesByAttribute(id);
          updates[id] = Array.isArray(res) ? res : res?.data || [];
        } catch {
          updates[id] = [];
        }
      }
      if (alive && Object.keys(updates).length)
        setTermsByAttr((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      alive = false;
    };
  }, [variationAttributes, variations, termsByAttr]);

  // default every variation attribute to "included"
  useEffect(() => {
    setIncluded((prev) => {
      const next = { ...prev };
      variationAttributes.forEach((a) => {
        if (!(a.attribute in next)) next[a.attribute] = true;
      });
      return next;
    });
  }, [variationAttributes]);

  // pre-select the values chosen in the Attributes tab (resolved against the
  // real AttributeValue terms by id / label / value / slug)
  useEffect(() => {
    setSelectedValues((prev) => {
      const next = { ...prev };
      variationAttributes.forEach((a) => {
        const id = a.attribute;
        if (next[id]) return; // already resolved / user-edited
        const terms = termsByAttr[id];
        if (!terms) return; // wait until the terms are loaded
        const wanted = (a.values || []).map((s) => String(s).toLowerCase());
        const sel = new Set();
        terms.forEach((term) => {
          const keys = [term._id, term.label, term.value, term.slug]
            .filter(Boolean)
            .map((x) => String(x).toLowerCase());
          if (wanted.some((w) => keys.includes(w))) sel.add(term._id);
        });
        next[id] = sel;
      });
      return next;
    });
  }, [variationAttributes, termsByAttr]);

  const existingSignatures = useMemo(
    () => new Set(variations.map((v) => signatureOf(v.attributes))),
    [variations]
  );

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleInclude = (id) =>
    setIncluded((p) => ({ ...p, [id]: !p[id] }));

  const toggleValue = (attrId, valueId) =>
    setSelectedValues((p) => {
      const cur = new Set(p[attrId] || []);
      cur.has(valueId) ? cur.delete(valueId) : cur.add(valueId);
      return { ...p, [attrId]: cur };
    });

  const allValuesSelected = (attrId) => {
    const terms = termsByAttr[attrId] || [];
    const sel = selectedValues[attrId] || new Set();
    return terms.length > 0 && terms.every((tm) => sel.has(tm._id));
  };

  const toggleAllValues = (attrId) =>
    setSelectedValues((p) => {
      const terms = termsByAttr[attrId] || [];
      const cur = p[attrId] || new Set();
      const all = terms.length > 0 && terms.every((tm) => cur.has(tm._id));
      return {
        ...p,
        [attrId]: all ? new Set() : new Set(terms.map((tm) => tm._id)),
      };
    });

  const valueLabel = (attrId, valueId) => {
    const term = (termsByAttr[attrId] || []).find((tm) => tm._id === valueId);
    return term?.label || term?.value || "";
  };

  const variationTitle = (v) =>
    v.attributes.map(
      (a) =>
        `${attrNameById[a.attributeId] || t("productForm.attribute")}: ${
          valueLabel(a.attributeId, a.valueId) || "â€”"
        }`
    );

  const updateField = (key, patch) =>
    setVariations((prev) =>
      prev.map((v) => (v.uid === key ? { ...v, ...patch } : v))
    );

  // ---- generate all missing combinations --------------------------------
  const handleGenerate = async () => {
    const active = variationAttributes.filter((a) => included[a.attribute]);
    if (!active.length)
      return notifyError(t("productForm.selectVariationAttribute"));

    const input = {};
    for (const a of active) {
      const sel = [...(selectedValues[a.attribute] || [])];
      if (!sel.length)
        return notifyError(
          t("productForm.selectValuesFor", {
            name: attrNameById[a.attribute] || a.name,
          })
        );
      input[a.attribute] = sel;
    }

    const combos = combinate(input); // [{ attrId: valueId, ... }, ...]

    const base =
      slugify(watch?.("sku")) || slugify(watch?.("productName")) || "var";
    const defaultRegular = numOrNull(watch?.("regularPrice")) ?? 0;
    const usedSkus = new Set(variations.map((v) => v.sku).filter(Boolean));

    const toCreate = [];
    for (const combo of combos) {
      const attrs = Object.entries(combo).map(([attributeId, valueId]) => ({
        attributeId,
        valueId,
      }));
      // never create two identical variations
      if (existingSignatures.has(signatureOf(attrs))) continue;

      const parts = attrs
        .map((a) => {
          const term = (termsByAttr[a.attributeId] || []).find(
            (tm) => tm._id === a.valueId
          );
          return slugify(term?.slug || term?.label || term?.value || "");
        })
        .filter(Boolean);
      const stem = [base, ...parts].filter(Boolean).join("-");
      let sku = stem || `var-${usedSkus.size + 1}`;
      let n = 2;
      while (usedSkus.has(sku)) sku = `${stem}-${n++}`;
      usedSkus.add(sku);

      toCreate.push({
        uid: uid(),
        _id: null,
        attributes: attrs,
        enabled: true,
        sku,
        barcode: "",
        regularPrice: defaultRegular,
        salePrice: "",
        costPrice: "",
        saleStart: "",
        saleEnd: "",
        manageStock: false,
        quantity: 0,
        reserved: 0,
        lowStockThreshold: "",
        allowBackorders: false,
        weight: "",
        length: "",
        width: "",
        height: "",
        shippingClassId: "",
        taxStatus: "taxable",
        image: "",
      });
    }

    if (!toCreate.length) return notifySuccess(t("productForm.noNewVariations"));

    // Add mode: the product does not exist yet, so buffer the combinations
    // locally. They are persisted by the submit hook once the product is
    // created (see useProductSubmit).
    if (!productId) {
      setVariations((prev) => [...toCreate, ...prev]);
      return notifySuccess(
        t("productForm.variationsGenerated", { count: toCreate.length })
      );
    }

    // Update mode: the product already exists, persist each variation now.
    try {
      setGenerating(true);
      const created = [];
      for (const v of toCreate) {
        const res = await ProductVariationServices.addVariation(
          toVariationPayload(v, productId)
        );
        const doc = res?._id ? res : res?.data;
        created.push(doc?._id ? fromServer(doc) : v);
      }
      setVariations((prev) => [...created, ...prev]);
      notifySuccess(
        t("productForm.variationsGenerated", { count: created.length })
      );
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setGenerating(false);
    }
  };

  // ---- save / delete a single variation ---------------------------------
  const handleSaveOne = async (v) => {
    if (!(v.sku || "").trim())
      return notifyError(t("productForm.skuRequiredVar"));
    const reg = numOrNull(v.regularPrice);
    if (reg == null) return notifyError(t("productForm.regularPriceRequiredVar"));
    const sale = numOrNull(v.salePrice);
    if (sale != null && sale > reg)
      return notifyError(t("productForm.salePriceTooHighVar"));

    // Add mode: no product to attach to yet. Field edits are already applied
    // to the buffered list through updateField, so just confirm â€” the hook
    // persists everything when the product is created.
    if (!productId) return notifySuccess(t("productForm.variationBuffered"));

    try {
      setSavingId(v.uid);
      const payload = toVariationPayload(v, productId);
      let doc;
      if (v._id) {
        const res = await ProductVariationServices.updateVariation(
          v._id,
          payload
        );
        doc = res?.data || res;
      } else {
        const res = await ProductVariationServices.addVariation(payload);
        doc = res?.data || res;
      }
      if (doc?._id) {
        setVariations((prev) =>
          prev.map((x) =>
            x.uid === v.uid ? { ...fromServer(doc), uid: x.uid } : x
          )
        );
      }
      notifySuccess(t("productForm.variationSaved"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteOne = async (v) => {
    try {
      if (v._id) await ProductVariationServices.deleteVariation(v._id);
      setVariations((prev) => prev.filter((x) => x.uid !== v.uid));
      setExpanded((prev) => {
        const next = new Set(prev);
        next.delete(v.uid);
        return next;
      });
      notifySuccess(t("productForm.variationDeleted"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  if (productType !== "variable") {
    return (
      <p style={{ fontSize: 14, color: W.textSecondary }}>
        {t("productForm.variationsVariableOnly")}
      </p>
    );
  }

  return (
    <div>
      {/* product not saved yet: variations are generated/edited locally and
          persisted automatically when the product is created */}
      {!productId && (
        <div
          style={{
            border: `1px solid ${W.border}`,
            background: "#e6f0f9",
            color: "#31708f",
            borderRadius: 4,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {t("productForm.variationsSavedOnCreate")}
        </div>
      )}

      {/* attribute + value selection */}
      <div
        style={{
          border: `1px solid ${W.border}`,
          borderRadius: 4,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${W.border}`,
            fontWeight: 600,
            fontSize: 13,
            color: W.text,
            background: W.sidebar,
          }}
        >
          {t("productForm.attributesForVariations")}
        </div>
        <div style={{ padding: 14 }}>
          {variationAttributes.length === 0 ? (
            <p style={{ fontSize: 13, color: W.textSecondary }}>
              {t("productForm.noVariationAttributes")}
            </p>
          ) : (
            variationAttributes.map((a) => {
              const terms = termsByAttr[a.attribute];
              const sel = selectedValues[a.attribute] || new Set();
              return (
                <div key={a.uid || a.attribute} style={{ marginBottom: 14 }}>
                  <label
                    className="flex items-center gap-2"
                    style={{ fontWeight: 600, fontSize: 13, color: W.text }}
                  >
                    <input
                      type="checkbox"
                      checked={!!included[a.attribute]}
                      onChange={() => toggleInclude(a.attribute)}
                    />
                    {attrNameById[a.attribute] || a.name || t("productForm.attribute")}
                  </label>
                  {included[a.attribute] && (
                    <div style={{ marginTop: 8, marginLeft: 24 }}>
                      {!terms ? (
                        <span style={{ fontSize: 12, color: W.textSecondary }}>
                          {t("productForm.loadingValues")}
                        </span>
                      ) : terms.length === 0 ? (
                        <span style={{ fontSize: 12, color: "#b91c1c" }}>
                          {t("productForm.noValuesForAttribute")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            onClick={() => toggleAllValues(a.attribute)}
                            style={smallLink}
                          >
                            {allValuesSelected(a.attribute)
                              ? t("productForm.clearAll")
                              : t("productForm.selectAll")}
                          </Button>
                          {terms.map((tm) => (
                            <Button
                              key={tm._id}
                              type="button"
                              onClick={() => toggleValue(a.attribute, tm._id)}
                              style={chipBtn(sel.has(tm._id))}
                            >
                              {tm.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !variationAttributes.length}
          className="flex items-center gap-2"
          style={{
            height: 36,
            padding: "0 16px",
            borderRadius: 4,
            background: W.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            opacity: generating || !variationAttributes.length ? 0.6 : 1,
          }}
        >
          <FiRefreshCw size={14} />
          {generating
            ? t("productForm.generating")
            : t("productForm.generateVariations")}
        </Button>
        <span style={{ fontSize: 12, color: W.textSecondary }}>
          {t("productForm.variationCount", { count: variations.length })}
        </span>
      </div>

      {/* variations table */}
      {variations.length === 0 ? (
        <p style={{ fontSize: 14, color: W.textSecondary }}>
          {t("productForm.noVariationsYet")}
        </p>
      ) : (
        <div style={{ border: `1px solid ${W.border}`, borderRadius: 4, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: W.sidebar, textAlign: "left" }}>
                <th style={th}>{t("productForm.variation")}</th>
                <th style={th}>{t("productForm.sku")}</th>
                <th style={th}>{t("productForm.regularPriceCol")}</th>
                <th style={th}>{t("productForm.salePriceCol")}</th>
                <th style={th}>{t("productForm.stock")}</th>
                <th style={th}>{t("productForm.statusCol")}</th>
                <th style={th}>{t("productForm.image")}</th>
                <th style={{ ...th, textAlign: "right" }}>
                  {t("productForm.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {variations.map((v) => {
                const open = expanded.has(v.uid);
                return (
                  <React.Fragment key={v.uid}>
                    <tr
                      style={{
                        borderTop: `1px solid ${W.border}`,
                        cursor: "pointer",
                      }}
                      onClick={() => toggle(v.uid)}
                    >
                      <td style={td}>
                        <div className="flex items-start gap-2">
                          {open ? (
                            <FiChevronUp size={14} style={{ marginTop: 2 }} />
                          ) : (
                            <FiChevronDown size={14} style={{ marginTop: 2 }} />
                          )}
                          <div>
                            {variationTitle(v).map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td style={td}>{v.sku || "â€”"}</td>
                      <td style={td}>{v.regularPrice !== "" ? v.regularPrice : "â€”"}</td>
                      <td style={td}>{v.salePrice !== "" ? v.salePrice : "â€”"}</td>
                      <td style={td}>
                        {v.manageStock ? v.quantity : t("productForm.notManaged")}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: v.enabled ? "#0f7b3f" : "#b91c1c",
                          }}
                        >
                          {v.enabled
                            ? t("productForm.enabledStatus")
                            : t("productForm.disabledStatus")}
                        </span>
                      </td>
                      <td style={td}>
                        {v.image ? (
                          <img
                            src={v.image}
                            alt=""
                            style={{
                              width: 36,
                              height: 36,
                              objectFit: "cover",
                              borderRadius: 4,
                              border: `1px solid ${W.border}`,
                            }}
                          />
                        ) : (
                          "â€”"
                        )}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <Button
                          type="button"
                          title={t("productForm.deleteVariation")}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOne(v);
                          }}
                          style={{ color: "#b91c1c" }}
                          className="hover:opacity-70"
                        >
                          <FiTrash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ padding: 0, borderTop: `1px solid ${W.border}` }}
                        >
                          <div style={{ background: W.sidebar, padding: 20 }}>
                            <VariationEditor
                              v={v}
                              shippingClasses={shippingClasses}
                              onChange={(patch) => updateField(v.uid, patch)}
                              onSave={() => handleSaveOne(v)}
                              onDelete={() => handleDeleteOne(v)}
                              saving={savingId === v.uid}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Variations;
