import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiChevronUp, FiTrash2, FiX, FiPlus, FiSearch } from "react-icons/fi";

//internal import
import AttributeServices from "@/services/AttributeServices";
import AttributeValueServices from "@/services/AttributeValueServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { W, WFONT, wInput } from "./styles";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const uid = () => `attr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Display label for a global attribute. Supports the new schema (name: String)
// and legacy documents that still carry a multilingual { title } / { name } object.
const attributeLabel = (g) => {
  if (!g) return "";
  if (typeof g.name === "string" && g.name.trim()) return g.name;
  if (g.name && typeof g.name === "object")
    return g.name.en || Object.values(g.name)[0] || "";
  if (typeof g.title === "string" && g.title.trim()) return g.title;
  if (g.title && typeof g.title === "object")
    return g.title.en || Object.values(g.title)[0] || "";
  return "";
};

// The product link stores its values as plain label strings, while the
// attribute catalog returns AttributeValue documents. Normalize both to a label
// so the select can mix saved values with catalog terms.
const valueLabel = (v) =>
  typeof v === "string" ? v : v?.label || v?.value || "";

// Field label above a control (WooCommerce uses the muted grey for these).
const fieldLabel = { fontSize: 14, fontWeight: 400, color: W.textSecondary };

// Outline button (white fill, blue border and text) â€” "Select all",
// "Select none" and "Create value" all share it.
const outlineButton = (disabled) => ({
  height: 48,
  borderRadius: 2,
  border: `1px solid ${W.primary}`,
  background: W.bg,
  color: W.primary,
  fontSize: 14,
  fontWeight: 400,
  padding: "0 12px",
  whiteSpace: "nowrap",
  opacity: disabled ? 0.5 : 1,
  cursor: disabled ? "not-allowed" : "pointer",
});

// Searchable multi-select over the attribute's terms, plus the three actions
// underneath it. Terms are fetched from the attribute catalog; selection is
// kept as label strings because that is what the ProductAttribute link stores.
// Values already saved on the product but missing from the catalog (typed by
// hand before this screen existed) still show as chips.
const AttributeValuesField = ({ attributeId, selected, onChange }) => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState(null); // null while loading
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [creating, setCreating] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  // load the terms of the linked global attribute
  useEffect(() => {
    if (!attributeId) return setTerms([]);
    let alive = true;
    setTerms(null);
    (async () => {
      try {
        const res = await AttributeValueServices.getValuesByAttribute(attributeId);
        const list = Array.isArray(res) ? res : res?.data || [];
        if (alive) setTerms(list);
      } catch (err) {
        if (alive) setTerms([]);
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [attributeId]);

  // close the dropdown when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const optionLabels = useMemo(
    () => (terms || []).map(valueLabel).filter(Boolean),
    [terms]
  );

  const q = query.trim().toLowerCase();
  const has = (list, label) =>
    list.some((v) => v.toLowerCase() === label.toLowerCase());

  // rows offered by the dropdown: not picked yet + matching the search
  const matches = useMemo(
    () =>
      optionLabels.filter(
        (l) => !has(selected, l) && (q ? l.toLowerCase().includes(q) : true)
      ),
    [optionLabels, selected, q]
  );

  // "Create value" only makes sense for a name that exists nowhere yet
  const canCreate =
    q.length > 0 && !has(optionLabels, q) && !has(selected, q) && !!attributeId;

  const add = (label) => {
    if (!has(selected, label)) onChange([...selected, label]);
    setQuery("");
    setHighlight(0);
  };

  const remove = (label) => onChange(selected.filter((v) => v !== label));

  const selectAll = () =>
    onChange([...selected, ...optionLabels.filter((l) => !has(selected, l))]);

  const createValue = async () => {
    if (!canCreate || creating) return;
    const label = query.trim();
    try {
      setCreating(true);
      // the backend fills the slug from the label when it is left empty
      const res = await AttributeValueServices.addValue({
        attributeId,
        label,
        slug: "",
        value: label,
        color: null,
        image: null,
        sortOrder: 0,
      });
      // the add endpoint may answer with the doc, { data }, or just a message
      const created =
        (res && res._id && res) || res?.attributeValue || res?.data || { label };
      setTerms((prev) => [...(prev || []), created]);
      add(label);
      setOpen(false);
      notifySuccess(res?.message || t("productForm.valueCreated"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setCreating(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) add(matches[highlight]);
      else if (canCreate) createValue();
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected.length) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <>
      <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
        {/* control: chips for what is picked + the search box */}
        <div
          className="flex flex-wrap items-center"
          style={{
            minHeight: 46,
            width: "100%",
            border: `1px solid ${W.inputBorder}`,
            borderRadius: 2,
            background: "var(--w-input-bg)",
            padding: "6px 10px",
            gap: 6,
            cursor: "text",
          }}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          {selected.map((v) => (
            <span
              key={v}
              className="flex items-center gap-1"
              style={{
                background: "#f0f6fb",
                color: W.primary,
                border: `1px solid ${W.border}`,
                borderRadius: 2,
                fontSize: 13,
                padding: "3px 8px",
              }}
            >
              {v}
              <FiX
                size={13}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v);
                }}
              />
            </span>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={selected.length ? "" : t("productForm.selectValues")}
            style={{
              flex: 1,
              minWidth: 120,
              height: 32,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: W.text,
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
          />
        </div>

        {/* results dropdown */}
        {open && (
          <div
            style={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              right: 0,
              marginTop: 2,
              background: W.bg,
              border: `1px solid ${W.border}`,
              borderRadius: 2,
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {terms === null ? (
              <div style={{ padding: "8px 12px", fontSize: 14, color: W.textSecondary }}>
                {t("productForm.loadingValues")}
              </div>
            ) : matches.length ? (
              matches.map((l, i) => (
                <div
                  key={l}
                  style={{
                    padding: "8px 12px",
                    fontSize: 14,
                    color: W.text,
                    cursor: "pointer",
                    background: highlight === i ? W.sidebar : "transparent",
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => add(l)}
                >
                  {l}
                </div>
              ))
            ) : (
              <div style={{ padding: "8px 12px", fontSize: 14, color: W.textSecondary }}>
                {t("productForm.noValuesFound")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* actions: select all / select none on the left, create on the right */}
      <div
        className="flex flex-col md:flex-row md:items-center md:justify-between"
        style={{ rowGap: 12, columnGap: 24, marginTop: 12 }}
      >
        <div className="flex flex-wrap items-center" style={{ gap: 12 }}>
          <Button
            type="button"
            className="w-auto md:w-[110px]"
            style={outlineButton(!optionLabels.length)}
            disabled={!optionLabels.length}
            onClick={selectAll}
          >
            {t("productForm.selectAll")}
          </Button>
          <Button
            type="button"
            className="w-auto md:w-[110px]"
            style={outlineButton(!selected.length)}
            disabled={!selected.length}
            onClick={() => onChange([])}
          >
            {t("productForm.selectNone")}
          </Button>
        </div>

        <Button
          type="button"
          className="w-auto md:w-[125px]"
          style={outlineButton(!canCreate || creating)}
          disabled={!canCreate || creating}
          title={canCreate ? undefined : t("productForm.typeValueToCreate")}
          onClick={createValue}
        >
          {creating ? (
            <LoadingSpinner alt="..." width={16} className="mx-auto" />
          ) : (
            t("productForm.createValue")
          )}
        </Button>
      </div>
    </>
  );
};

// One attribute block: name, values (searchable multi-select), visible,
// used-for-variation, delete.
//
// A block added by "Add new" carries no attribute id, so its name is an open
// input. Committing that name links the block to a global attribute (existing
// or freshly created) via onResolveName, after which the name is fixed and the
// values select has the id it needs. A block added from the search field is
// already linked and shows its name as read-only text.
const AttributeBlock = ({
  item,
  expanded,
  onToggle,
  onChange,
  onRemove,
  onResolveName,
}) => {
  const { t } = useTranslation();
  const [draftName, setDraftName] = useState(item.name || "");
  const [linking, setLinking] = useState(false);

  const commitName = async () => {
    const name = draftName.trim();
    if (linking || !name || item.attribute) return;
    try {
      setLinking(true);
      const g = await onResolveName(name);
      // on failure the block stays editable so the name can be corrected
      if (g?._id)
        onChange({
          ...item,
          attribute: g._id,
          name: attributeLabel(g),
          usedForVariations: Boolean(g.isVariation),
        });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${W.border}`,
        borderRadius: 4,
        marginBottom: 12,
        background: W.bg,
      }}
    >
      {/* block header */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 44, background: W.sidebar, cursor: "pointer" }}
        onClick={onToggle}
      >
        {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        <span style={{ fontSize: 14, fontWeight: 600, color: W.text, flex: 1 }}>
          {item.name?.trim() ||
            draftName.trim() ||
            t("productForm.newAttribute")}
        </span>
        <Button
          type="button"
          title={t("productForm.removeAttribute")}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70"
          style={{ color: W.textSecondary }}
        >
          <FiTrash2 size={16} />
        </Button>
      </div>

      {/* block body: name + toggles on the left, values on the right.
          Stacks into a single column below the md breakpoint (768px). */}
      {expanded && (
        <div
          className="flex flex-col md:flex-row"
          style={{ padding: 20, columnGap: 24, rowGap: 12, fontFamily: WFONT }}
        >
          {/* left column â€” name: an input until the block is linked to a
              global attribute, plain text once it is */}
          <div className="w-full md:w-[220px] md:shrink-0">
            <div style={fieldLabel}>{t("productForm.name")}:</div>
            {item.attribute ? (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: W.text,
                  marginTop: 4,
                  wordBreak: "break-word",
                }}
              >
                {item.name?.trim() || t("productForm.attribute")}
              </div>
            ) : (
              <input
                type="text"
                autoFocus
                value={draftName}
                disabled={linking}
                placeholder={t("productForm.attributeNamePlaceholder")}
                style={{ ...wInput, borderRadius: 2, marginTop: 4 }}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
            )}

            <div className="flex flex-col" style={{ gap: 10, marginTop: 16 }}>
              <label
                className="flex items-center gap-2"
                style={{ fontSize: 14, color: W.text }}
              >
                <input
                  type="checkbox"
                  checked={item.visible !== false}
                  onChange={(e) =>
                    onChange({ ...item, visible: e.target.checked })
                  }
                />
                {t("productForm.visibleOnProductPage")}
              </label>

              <label
                className="flex items-center gap-2"
                style={{ fontSize: 14, color: W.text }}
              >
                <input
                  type="checkbox"
                  checked={item.usedForVariations}
                  onChange={(e) =>
                    onChange({ ...item, usedForVariations: e.target.checked })
                  }
                />
                {t("productForm.usedForVariations")}
              </label>
            </div>
          </div>

          {/* right column â€” values. They hang off the attribute id, so an
              unnamed block shows what to do first instead of a dead select. */}
          <div className="flex-1 min-w-0">
            <div style={{ ...fieldLabel, marginBottom: 4 }}>
              {t("productForm.valuesLabel")}:
            </div>
            {item.attribute ? (
              <AttributeValuesField
                attributeId={item.attribute}
                selected={item.values || []}
                onChange={(values) => onChange({ ...item, values })}
              />
            ) : (
              <p style={{ fontSize: 14, color: W.textSecondary, marginTop: 8 }}>
                {t("productForm.nameAttributeFirst")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Searchable select (combobox) for attributes:
//  - real-time search over the global attribute catalog
//  - shows matching results, excludes already-added ones (no duplicates)
//  - pick an existing attribute, or create a brand new one when nothing matches
const AttributeSearchSelect = ({ options, usedIds, onPick, onAddBlank }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef(null);

  // close the dropdown when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const q = query.trim().toLowerCase();

  // results: not already added + name matches the query
  const matches = useMemo(
    () =>
      options.filter((g) => {
        if (usedIds.has(g._id)) return false;
        return q ? attributeLabel(g).toLowerCase().includes(q) : true;
      }),
    [options, usedIds, q]
  );

  const pick = (g) => {
    onPick(g);
    setQuery("");
    setOpen(false);
    setHighlight(0);
  };

  const handleKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) pick(matches[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const rowBase = {
    padding: "8px 12px",
    fontSize: 14,
    color: W.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div className="flex items-center" style={{ gap: 12, marginBottom: 16 }}>
      {/* search field: searches and selects only */}
      <div
        ref={boxRef}
        style={{ position: "relative", flex: 1, maxWidth: 360 }}
      >
        <FiSearch
          size={15}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: W.textSecondary,
            pointerEvents: "none",
          }}
        />
        <input
          type="text"
          value={query}
          placeholder={t("productForm.searchAttribute")}
          style={{ ...wInput, paddingLeft: 32, width: "100%" }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />

        {/* results dropdown */}
        {open && (
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
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {matches.length ? (
              matches.map((g, i) => (
                <div
                  key={g._id}
                  style={{
                    ...rowBase,
                    background: highlight === i ? W.sidebar : "transparent",
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(g)}
                >
                  {attributeLabel(g)}
                </div>
              ))
            ) : (
              <div
                style={{ ...rowBase, color: W.textSecondary, cursor: "default" }}
              >
                {t("productForm.noAttributesFound")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* opens an empty block to fill in, same block the search field appends */}
      <Button
        type="button"
        className="flex items-center justify-center"
        style={{ ...outlineButton(false), height: 36, gap: 6 }}
        onClick={onAddBlank}
      >
        <FiPlus size={15} />
        {t("productForm.addNew")}
      </Button>
    </div>
  );
};

const Attributs = ({ attributes, setAttributes }) => {
  const { t } = useTranslation();
  const [globalAttributes, setGlobalAttributes] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());

  // fetch the global attribute catalog for the dropdown
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // GET /api/attributes/ returns a paginated object { attributes, ... }
        const res = await AttributeServices.getAllAttributes({ limit: 100 });
        const list = Array.isArray(res?.attributes) ? res.attributes : [];
        if (mounted) setGlobalAttributes(list);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const usedGlobalIds = useMemo(
    () => new Set(attributes.map((a) => a.attribute).filter(Boolean)),
    [attributes]
  );

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // add an existing global attribute as a new block (guards against duplicates)
  const addExisting = (g) => {
    if (!g?._id) return;
    if (usedGlobalIds.has(g._id)) {
      return notifyError(t("productForm.attributeAlreadyAdded"));
    }
    const newItem = {
      uid: uid(),
      attribute: g._id,
      name: attributeLabel(g),
      values: [],
      visible: true,
      usedForVariations: Boolean(g.isVariation),
    };
    setAttributes((prev) => [...prev, newItem]);
    setExpanded((prev) => new Set(prev).add(newItem.uid));
  };

  // "Add new" drops an empty block the user fills in, the way WooCommerce does.
  // It carries no attribute id yet: naming it is what links or creates one.
  const addBlank = () => {
    const newItem = {
      uid: uid(),
      attribute: null,
      name: "",
      values: [],
      visible: true,
      usedForVariations: false,
    };
    setAttributes((prev) => [...prev, newItem]);
    setExpanded((prev) => new Set(prev).add(newItem.uid));
  };

  // Turn the name typed in a blank block into a global attribute: reuse the one
  // that already carries that name, otherwise create it. Returns the attribute
  // doc so the block can link itself, or null when it could not be resolved.
  // Only linked blocks are persisted (see buildProductAttributesPayload), which
  // is why a block stays editable until this succeeds.
  const resolveGlobalAttribute = async (rawName) => {
    const name = rawName.trim();
    if (!name) return null;

    const isTaken = (g) =>
      usedGlobalIds.has(g._id)
        ? (notifyError(t("productForm.attributeAlreadyAdded")), true)
        : false;

    // never create a duplicate: if it already exists globally, link to it
    const existing = globalAttributes.find(
      (g) => attributeLabel(g).trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) return isTaken(existing) ? null : existing;

    try {
      const res = await AttributeServices.addAttribute({
        name,
        slug: "", // backend auto-generates the slug from the name
        description: "",
        type: "select",
        displayType: "select",
        isVariation: false,
        status: "active",
      });

      // the add endpoint may return the doc, { attribute }, { data }, or just a
      // message â€” resolve the created attribute (with its _id) either way.
      let created = (res && res._id && res) || res?.attribute || res?.data || null;
      if (!created?._id) {
        const list = await AttributeServices.getAllAttributes({ name, limit: 5 });
        const arr = Array.isArray(list?.attributes) ? list.attributes : [];
        created =
          arr.find(
            (g) => attributeLabel(g).trim().toLowerCase() === name.toLowerCase()
          ) ||
          arr[0] ||
          null;
      }

      if (!created?._id) {
        notifyError(t("productForm.attributeCreateLoadError"));
        return null;
      }
      if (isTaken(created)) return null;

      setGlobalAttributes((prev) =>
        prev.some((g) => g._id === created._id) ? prev : [created, ...prev]
      );
      notifySuccess(res?.message || t("productForm.attributeCreatedAdded"));
      return created;
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      return null;
    }
  };

  const updateItem = (updated) =>
    setAttributes((prev) => prev.map((a) => (a.uid === updated.uid ? updated : a)));

  const removeItem = (id) => {
    setAttributes((prev) => prev.filter((a) => a.uid !== id));
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSave = () => {
    // an unnamed block is not linked to a global attribute, so it would be
    // dropped silently on submit â€” flag it rather than the missing values
    const unnamed = attributes.some((a) => !a.attribute);
    if (unnamed) return notifyError(t("productForm.attributeNeedsName"));
    const noValues = attributes.some((a) => (a.values || []).length === 0);
    if (noValues) return notifyError(t("productForm.attributeNeedsValue"));
    notifySuccess(t("productForm.attributesSaved"));
  };

  return (
    <div>
      {/* top bar: search field to pick an existing attribute + "Add new" */}
      <AttributeSearchSelect
        options={globalAttributes}
        usedIds={usedGlobalIds}
        onPick={addExisting}
        onAddBlank={addBlank}
      />

      {/* attribute blocks */}
      {attributes.length === 0 ? (
        <p style={{ fontSize: 14, color: W.textSecondary, marginBottom: 16 }}>
          {t("productForm.noAttributesYet")}
        </p>
      ) : (
        attributes.map((item) => (
          <AttributeBlock
            key={item.uid}
            item={item}
            expanded={expanded.has(item.uid)}
            onToggle={() => toggle(item.uid)}
            onChange={updateItem}
            onRemove={() => removeItem(item.uid)}
            onResolveName={resolveGlobalAttribute}
          />
        ))
      )}

      {/* save */}
      <div
        className="flex justify-end"
        style={{ borderTop: `1px solid ${W.border}`, paddingTop: 16, marginTop: 4 }}
      >
        <Button
          type="button"
          onClick={handleSave}
          style={{
            height: 38,
            padding: "0 18px",
            borderRadius: 4,
            background: W.primary,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {t("productForm.saveAttributes")}
        </Button>
      </div>
    </div>
  );
};

export default Attributs;
