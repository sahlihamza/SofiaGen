import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";

//internal import
import ProductServices from "@/services/ProductServices";
import { notifyError } from "@/utils/toast";
import { W, wInput } from "./styles";
import { Button } from "@sofia/ui";

// A small searchable multi-select of products (adds ObjectIds to an array).
const ProductMultiSelect = ({
  label,
  help,
  placeholder,
  selected,
  setSelected,
  options,
  nameById,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter(
        (p) =>
          !selectedSet.has(p._id) &&
          (!q || p.productName?.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [options, selectedSet, query]);

  const add = (id) => {
    setSelected((prev) => [...prev, id]);
    setQuery("");
    setOpen(false);
  };

  const remove = (id) => setSelected((prev) => prev.filter((x) => x !== id));

  return (
    <div className="flex items-start" style={{ marginBottom: 18 }}>
      <label
        style={{
          width: 170,
          minWidth: 170,
          fontSize: 14,
          fontWeight: 600,
          color: W.text,
          paddingTop: 8,
        }}
      >
        {label}
      </label>

      <div style={{ flex: 1, maxWidth: 420, position: "relative" }}>
        {/* selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 8 }}>
            {selected.map((id) => (
              <span
                key={id}
                className="flex items-center gap-1"
                style={{
                  background: "#f0f6fb",
                  color: W.primary,
                  border: `1px solid ${W.border}`,
                  borderRadius: 4,
                  fontSize: 13,
                  padding: "3px 8px",
                }}
              >
                {nameById[id] || t("productForm.unknownProduct")}
                <FiX
                  size={13}
                  className="cursor-pointer"
                  onClick={() => remove(id)}
                />
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          value={query}
          placeholder={placeholder}
          style={wInput}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />

        {/* suggestions dropdown */}
        {open && matches.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              right: 0,
              marginTop: 2,
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: 4,
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {matches.map((p) => (
              <Button
                key={p._id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p._id)}
                className="w-full text-left px-3 hover:bg-gray-50"
                style={{ height: 34, fontSize: 14, color: W.text }}
              >
                {p.productName}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex justify-end" style={{ paddingTop: 9 }}>
        {help ? (
          <span
            title={help}
            style={{ fontSize: 12, color: W.textSecondary, cursor: "help" }}
          >
            ?
          </span>
        ) : null}
      </div>
    </div>
  );
};

const LinkedProduct = ({
  currentId,
  upSells,
  setUpSells,
  crossSells,
  setCrossSells,
}) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);

  // fetch the product list once to choose linked products from
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await ProductServices.getAllProducts({
          page: 1,
          limit: 1000,
        });
        if (mounted) setProducts(res?.products || []);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // exclude the product being edited from its own linked lists
  const options = useMemo(
    () => products.filter((p) => p._id !== currentId),
    [products, currentId]
  );

  const nameById = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p._id] = p.productName;
    });
    return map;
  }, [products]);

  return (
    <>
      <ProductMultiSelect
        label={t("productForm.upSells")}
        help={t("productForm.upSellsHelp")}
        placeholder={t("productForm.searchProduct")}
        selected={upSells}
        setSelected={setUpSells}
        options={options}
        nameById={nameById}
      />
      <ProductMultiSelect
        label={t("productForm.crossSells")}
        help={t("productForm.crossSellsHelp")}
        placeholder={t("productForm.searchProduct")}
        selected={crossSells}
        setSelected={setCrossSells}
        options={options}
        nameById={nameById}
      />
    </>
  );
};

export default LinkedProduct;


