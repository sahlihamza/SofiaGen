import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronUp, FiChevronDown, FiX } from "react-icons/fi";

//internal import
import ProductTagServices from "@/services/ProductTagServices";
import { notifyError } from "@/utils/toast";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

// ---- Design tokens (WordPress "Product tags" metabox look) ----------------
const TAG = {
  accent: "var(--tag-accent)",
  border: "var(--tag-border)",
  bg: "var(--tag-bg)",
  title: "var(--tag-title)",
  muted: "var(--tag-muted)",
  font: "Inter, Roboto, ui-sans-serif, system-ui, sans-serif",
};

// Tags are real ProductTag entities (many-to-many with the product through
// ProductTagRelation). Same functionality as before â€” type a name and Add it
// (comma-separated names are supported); an existing tag is attached, a new
// one is created on the fly. `selectedTags` holds the attached tag ids.
const Tags = ({ tagList, setTagList, selectedTags, setSelectedTags }) => {
  // aliased to `tr` because `t` is used as the tag loop variable below
  const { t: tr } = useTranslation();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hoverAdd, setHoverAdd] = useState(false);
  const [open, setOpen] = useState(false);

  // id -> name, so selected chips can render their label
  const nameById = useMemo(() => {
    const map = {};
    tagList.forEach((t) => {
      map[t._id] = t.name;
    });
    return map;
  }, [tagList]);

  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  // Live search: match the last comma segment against the saved tags so the
  // user can see whether a tag already exists and pick it instead of creating
  // a duplicate.
  const term = input.split(",").pop().trim().toLowerCase();
  const matches = useMemo(
    () =>
      term
        ? tagList
            .filter(
              (t) =>
                !selectedSet.has(t._id) &&
                t.name?.toLowerCase().includes(term)
            )
            .slice(0, 8)
        : [],
    [tagList, selectedSet, term]
  );
  const exactExists = tagList.some((t) => t.name?.toLowerCase() === term);

  const attach = (id) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setInput("");
    setOpen(false);
  };

  const remove = (id) =>
    setSelectedTags((prev) => prev.filter((x) => x !== id));

  // Add one or several comma-separated tags. Each name is matched against the
  // existing tags (case-insensitive); unknown names are created via the API.
  const handleAdd = async () => {
    const names = input
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) return;

    try {
      setBusy(true);
      let list = tagList; // running copy so batch-created tags are reused
      const idsToAttach = [];

      for (const name of names) {
        const existing = list.find(
          (t) => t.name?.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          idsToAttach.push(existing._id);
          continue;
        }
        const created = await ProductTagServices.addProductTag({ name });
        list = [created, ...list];
        idsToAttach.push(created._id);
      }

      setTagList(list);
      setSelectedTags((prev) => {
        const next = new Set(prev);
        idsToAttach.forEach((id) => next.add(id));
        return [...next];
      });
      setInput("");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setBusy(false);
    }
  };

  // Header icons: one closes the panel, the other opens it. Whichever one
  // matches the current state has nothing to do, so it stays inert.
  const headerIcons = [
    {
      key: "collapse",
      Icon: FiChevronUp,
      label: tr("productForm.collapse"),
      onClick: () => setCollapsed(true),
      disabled: collapsed,
    },
    {
      key: "expand",
      Icon: FiChevronDown,
      label: tr("productForm.expand"),
      onClick: () => setCollapsed(false),
      disabled: !collapsed,
    },
  ];

  return (
    <div
      style={{
        background: TAG.bg,
        border: `1px solid ${TAG.border}`,
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        fontFamily: TAG.font,
        overflow: "hidden",
      }}
    >
      {/* header: title + control icons */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "16px 20px", borderBottom: `1px solid ${TAG.border}` }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: TAG.title }}>
          {tr("productForm.productTags")}
        </span>
        <div className="flex items-center" style={{ gap: 14, color: TAG.muted }}>
          {headerIcons.map(({ key, Icon, label, onClick, disabled }) => (
            <Button
              key={key}
              type="button"
              onClick={onClick}
              disabled={disabled}
              title={label}
              aria-label={label}
              className={disabled ? "flex" : "flex hover:text-gray-700"}
              style={{
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
                transition: "color .15s ease, opacity .15s ease",
              }}
            >
              <Icon size={18} />
            </Button>
          ))}
        </div>
      </div>

      {/* body */}
      {!collapsed && (
        <div style={{ padding: "16px 20px" }}>
          {/* input + Add button */}
          <div
            className="flex items-stretch"
            style={{ gap: 10, position: "relative" }}
          >
            <input
              type="text"
              value={input}
              placeholder={tr("productForm.addTags")}
              onChange={(e) => {
                setInput(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              style={{
                flex: 1,
                minWidth: 0,
                height: 40,
                border: `1px solid ${TAG.border}`,
                borderRadius: 6,
                padding: "0 12px",
                fontSize: 14,
                color: TAG.title,
                background: TAG.bg,
                outline: "none",
              }}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={busy}
              onMouseEnter={() => setHoverAdd(true)}
              onMouseLeave={() => setHoverAdd(false)}
              className="flex items-center justify-center"
              style={{
                minWidth: 72,
                height: 40,
                padding: "0 16px",
                borderRadius: 6,
                border: `1px solid ${TAG.accent}`,
                background: hoverAdd && !busy ? TAG.accent : TAG.bg,
                color: hoverAdd && !busy ? "#fff" : TAG.accent,
                fontSize: 14,
                fontWeight: 500,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
                transition: "background .15s ease, color .15s ease",
              }}
            >
              {busy ? (
                <LoadingSpinner alt="..." width={16} />
              ) : (
                tr("productForm.add")
              )}
            </Button>

            {/* live search: saved tags matching what is being typed */}
            {open && term && (matches.length > 0 || exactExists) && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 20,
                  top: 44,
                  left: 0,
                  right: 0,
                  background: TAG.bg,
                  border: `1px solid ${TAG.border}`,
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {matches.length > 0 ? (
                  matches.map((t) => (
                    <Button
                      key={t._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => attach(t._id)}
                      className="w-full text-left hover:bg-gray-50"
                      style={{
                        display: "block",
                        padding: "8px 12px",
                        fontSize: 14,
                        color: TAG.title,
                      }}
                    >
                      {t.name}
                    </Button>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      color: TAG.muted,
                    }}
                  >
                    {tr("productForm.alreadyAdded")}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* helper text */}
          <p style={{ marginTop: 8, fontSize: 12.5, color: TAG.muted }}>
            {tr("productForm.separateTagsCommas")}
          </p>

          {/* attached tags */}
          {selectedTags.length > 0 && (
            <div
              className="flex flex-wrap"
              style={{ gap: 8, marginTop: 14 }}
            >
              {selectedTags.map((id) => (
                <span
                  key={id}
                  className="flex items-center"
                  style={{
                    gap: 6,
                    background: "#f0f6fc",
                    color: TAG.accent,
                    border: `1px solid ${TAG.border}`,
                    borderRadius: 4,
                    fontSize: 13,
                    padding: "4px 10px",
                  }}
                >
                  {nameById[id] || tr("productForm.unknownTag")}
                  <FiX
                    size={13}
                    className="cursor-pointer"
                    onClick={() => remove(id)}
                  />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tags;
