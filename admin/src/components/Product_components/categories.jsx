import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronRight, FiChevronDown, FiChevronUp } from "react-icons/fi";

//internal import
import ProductCategoryServices from "@/services/ProductCategoryServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import {
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";
  buildCategoryTree,
  buildCategoryOptions,
  parentIdOf,
  slugify,
} from "@/utils/categoryTree";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

// ---- WordPress admin / WooCommerce palette -------------------------------
// Resolves to the --pc-* CSS variables (assets/css/custom.css) so the panel
// follows the app light/dark theme, like the other product-form cards. In
// light mode these are the exact WordPress admin colors (#DCDCDE, #2271B1...);
// dark mode swaps in the app's dark palette.
const WC = {
  card: "var(--pc-card)",
  border: "var(--pc-border)",
  inputBorder: "var(--pc-input-border)",
  text: "var(--pc-text)",
  textMuted: "var(--pc-text-muted)",
  blue: "var(--pc-blue)",
  hover: "var(--pc-hover)",
  onBlue: "var(--pc-on-blue)",
  font: "Inter, Roboto, -apple-system, 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
};

const ALL_TAB = "all";
const MOST_USED_TAB = "mostUsed";

// Indentation step per nesting level, and the fixed height of every row.
const INDENT = 20;
const ROW_HEIGHT = 30;

// ---------------------------------------------------------------------------
// One row of the tree: indent + optional expand arrow + checkbox + name.
// `depth` drives the 20px-per-level indentation. Rows that have children are
// slightly bolder so the hierarchy reads at a glance.
// ---------------------------------------------------------------------------
const CategoryRow = ({
  category,
  depth = 0,
  hasChildren,
  isCollapsed,
  onToggleCollapse,
  checked,
  onCheck,
  onEdit,
  expandLabel,
  collapseLabel,
  editLabel,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="flex items-center group"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        paddingLeft: 6 + depth * INDENT,
        paddingRight: 6,
        height: ROW_HEIGHT,
        background: hover ? WC.hover : "transparent",
      }}
    >
      {/* fixed slot so leaf rows stay aligned with rows that have an arrow */}
      <span style={{ width: 16, flexShrink: 0 }} className="flex items-center">
        {hasChildren && (
          <Button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? expandLabel : collapseLabel}
            style={{
              display: "flex",
              color: WC.textMuted,
              cursor: "pointer",
              // one chevron that rotates, so it turns with the panel instead
              // of swapping to a different glyph mid-animation
              transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
              transition: "transform 200ms ease",
            }}
          >
            <FiChevronRight size={13} />
          </Button>
        )}
      </span>

      <label
        className="flex items-center flex-1 min-w-0"
        style={{
          gap: 7,
          fontSize: 13,
          fontWeight: hasChildren ? 500 : 400,
          color: WC.text,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onCheck}
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            accentColor: WC.blue,
            cursor: "pointer",
          }}
        />
        <span className="truncate" title={category.name}>
          {category.name}
        </span>
        {category.count != null && (
          <span style={{ color: WC.textMuted, fontSize: 12 }}>
            ({category.count})
          </span>
        )}
      </label>

      {/* Reassigning a parent is the only way to build the hierarchy, so this
          stays visible instead of being revealed on hover â€” it just stays
          understated until the row is pointed at. */}
      <Button
        type="button"
        onClick={onEdit}
        style={{
          fontSize: 12,
          color: hover ? WC.blue : WC.textMuted,
          opacity: hover ? 1 : 0.75,
          flexShrink: 0,
          paddingLeft: 6,
          cursor: "pointer",
          transition: "color 150ms ease, opacity 150ms ease",
        }}
      >
        {editLabel}
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Renders one level of the tree and recurses into the children, so nesting is
// unlimited. Children live in their own wrapper rather than being filtered out
// of a flat list, which is what makes the open/close animatable: the wrapper
// is a grid whose single row goes from 0fr to 1fr, transitioning to the real
// content height without anyone having to measure it.
// ---------------------------------------------------------------------------
const CategoryBranch = ({ nodes, depth = 0, collapsedIds, labels, ...rest }) =>
  nodes.map((node) => {
    const id = String(node._id);
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(id);

    return (
      <div key={id}>
        <CategoryRow
          category={node}
          depth={depth}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => rest.onToggleCollapse(id)}
          checked={rest.isChecked(id)}
          onCheck={() => rest.onCheck(id)}
          onEdit={() => rest.onEdit(node)}
          expandLabel={labels.expand}
          collapseLabel={labels.collapse}
          editLabel={labels.edit}
        />

        {hasChildren && (
          <div
            style={{
              display: "grid",
              gridTemplateRows: isCollapsed ? "0fr" : "1fr",
              transition: "grid-template-rows 200ms ease",
            }}
          >
            {/* min-height:0 lets the grid row actually shrink to nothing.
                visibility keeps collapsed checkboxes out of the tab order â€”
                it flips to visible instantly on open, and only after the
                200ms close has finished on collapse. */}
            <div
              style={{
                overflow: "hidden",
                minHeight: 0,
                visibility: isCollapsed ? "hidden" : "visible",
                transition: "visibility 200ms",
              }}
            >
              <CategoryBranch
                nodes={node.children}
                depth={depth + 1}
                collapsedIds={collapsedIds}
                labels={labels}
                {...rest}
              />
            </div>
          </div>
        )}
      </div>
    );
  });

// ---------------------------------------------------------------------------
// Product Categories metabox â€” a clone of the WooCommerce sidebar panel.
// A product can belong to several categories; only ids are held in
// `selectedCategories`, never the names.
// ---------------------------------------------------------------------------
const Categories = ({
  categoryList,
  setCategoryList,
  selectedCategories,
  setSelectedCategories,
}) => {
  const { t } = useTranslation();

  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState(ALL_TAB);

  // Hover repaints colors that are also set inline, and an inline style beats
  // a stylesheet rule â€” so these two are tracked in React rather than in CSS.
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [hoverSubmit, setHoverSubmit] = useState(false);

  // --- add / edit category form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = creating
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  // --- tree state: ids whose children are hidden (roots start expanded)
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  // --- "Most Used" list, fetched lazily the first time the tab is opened
  const [mostUsed, setMostUsed] = useState(null);
  const [loadingMostUsed, setLoadingMostUsed] = useState(false);

  useEffect(() => {
    if (tab !== MOST_USED_TAB || mostUsed !== null) return;

    let cancelled = false;
    setLoadingMostUsed(true);
    ProductCategoryServices.getMostUsedCategories()
      .then((res) => {
        if (!cancelled) setMostUsed(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setMostUsed([]);
        notifyError(err?.response?.data?.message || err?.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingMostUsed(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab, mostUsed]);

  const tree = useMemo(() => buildCategoryTree(categoryList), [categoryList]);

  // A category can be neither its own parent nor a child of its descendants,
  // otherwise the branch would detach from the tree (A -> B -> A). The option
  // builder drops the whole excluded branch.
  const parentOptions = useMemo(
    () => buildCategoryOptions(categoryList, editingId),
    [categoryList, editingId]
  );

  const selectedSet = useMemo(
    () => new Set((selectedCategories || []).map(String)),
    [selectedCategories]
  );

  const toggleCollapse = (id) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelected = (id) =>
    setSelectedCategories((prev = []) => {
      const key = String(id);
      return prev.map(String).includes(key)
        ? prev.filter((x) => String(x) !== key)
        : [...prev, key];
    });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setParentId("");
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  // Pre-fill the form from an existing category (edit mode).
  const startEdit = (category) => {
    setEditingId(category._id);
    setName(category.name || "");
    setParentId(parentIdOf(category) || "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return notifyError(t("productForm.enterCategoryName"));

    // Siblings must stay distinguishable, but the same name under two
    // different parents is fine ("Brakes > Pads" and "Engine > Pads").
    const duplicate = categoryList.some(
      (c) =>
        String(c._id) !== String(editingId) &&
        c.name?.toLowerCase() === trimmedName.toLowerCase() &&
        (parentIdOf(c) || "") === (parentId || "")
    );
    if (duplicate) return notifyError(t("productForm.categoryExists"));

    // The slug stays optional in the UI â€” the backend derives it from the name.
    const payload = {
      name: trimmedName,
      slug: slugify(trimmedName),
      parentId: parentId || null,
    };

    try {
      setSaving(true);

      if (editingId) {
        const res = await ProductCategoryServices.updateCategory(
          editingId,
          payload
        );
        const updated = res?.data || res;
        setCategoryList((prev) =>
          prev.map((c) => (String(c._id) === String(editingId) ? updated : c))
        );
        notifySuccess(t("productForm.categoryUpdated"));
      } else {
        const created = await ProductCategoryServices.addCategory(payload);
        setCategoryList((prev) => [created, ...prev]);
        // newly created categories are checked right away, like WooCommerce
        setSelectedCategories((prev = []) => [...prev, String(created._id)]);
        // reveal the new child under its parent
        if (payload.parentId) {
          setCollapsedIds((prev) => {
            const next = new Set(prev);
            next.delete(String(payload.parentId));
            return next;
          });
        }
        notifySuccess(t("productForm.categoryAdded"));
      }

      setMostUsed(null); // counts changed â€” refetch when the tab is reopened
      closeForm();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSaving(false);
    }
  };

  // Header icons: one closes the panel, the other opens it. Whichever one
  // matches the current state has nothing to do, so it stays inert.
  const headerIcons = [
    {
      key: "collapse",
      Icon: FiChevronUp,
      label: t("productForm.collapse"),
      onClick: () => setCollapsed(true),
      disabled: collapsed,
    },
    {
      key: "expand",
      Icon: FiChevronDown,
      label: t("productForm.expand"),
      onClick: () => setCollapsed(false),
      disabled: !collapsed,
    },
  ];

  const tabStyle = (isActive) => ({
    padding: "6px 12px",
    fontSize: 13,
    lineHeight: "18px",
    cursor: "pointer",
    border: `1px solid ${WC.border}`,
    borderBottom: isActive ? `1px solid ${WC.card}` : `1px solid ${WC.border}`,
    background: isActive ? WC.card : WC.hover,
    color: isActive ? WC.blue : WC.textMuted,
    marginBottom: -1, // overlap the list border so the active tab joins it
    marginRight: 2,
    position: "relative",
    zIndex: 1,
  });

  const fieldStyle = {
    width: "100%",
    height: 36,
    border: `1px solid ${WC.inputBorder}`,
    borderRadius: 3,
    padding: "0 8px",
    fontSize: 13,
    color: WC.text,
    background: WC.card,
    outline: "none",
  };

  const listContent = () => {
    if (tab === MOST_USED_TAB) {
      if (loadingMostUsed) {
        return (
          <p style={{ padding: 8, fontSize: 13, color: WC.textMuted }}>
            {t("productForm.loading")}
          </p>
        );
      }
      if (!mostUsed?.length) {
        return (
          <p style={{ padding: 8, fontSize: 13, color: WC.textMuted }}>
            {t("productForm.noCategoriesFound")}
          </p>
        );
      }
      // Most Used is a flat ranking, so no indentation and no arrows.
      return mostUsed.map((category) => (
        <CategoryRow
          key={String(category._id)}
          category={category}
          hasChildren={false}
          checked={selectedSet.has(String(category._id))}
          onCheck={() => toggleSelected(category._id)}
          onEdit={() => startEdit(category)}
          editLabel={t("productForm.edit")}
        />
      ));
    }

    if (!tree.length) {
      return (
        <p style={{ padding: 8, fontSize: 13, color: WC.textMuted }}>
          {t("productForm.noCategoriesFound")}
        </p>
      );
    }

    return (
      <CategoryBranch
        nodes={tree}
        collapsedIds={collapsedIds}
        onToggleCollapse={toggleCollapse}
        isChecked={(id) => selectedSet.has(id)}
        onCheck={toggleSelected}
        onEdit={startEdit}
        labels={{
          expand: t("productForm.expand"),
          collapse: t("productForm.collapse"),
          edit: t("productForm.edit"),
        }}
      />
    );
  };

  return (
    <div
      style={{
        width: "100%",
        background: WC.card,
        border: `1px solid ${WC.border}`,
        borderRadius: 4,
        fontFamily: WC.font,
        // makes the browser paint the native checkboxes, the select arrow and
        // the select popup (all OS-drawn) to match the active theme
        colorScheme: "var(--pc-color-scheme)",
      }}
    >
      {/* ---- header ---- */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          borderBottom: collapsed ? "none" : `1px solid ${WC.border}`,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: WC.text }}>
          {t("productForm.productCategories")}
        </span>
        <div className="flex items-center" style={{ gap: 10 }}>
          {headerIcons.map(({ key, Icon, label, onClick, disabled }) => (
            <Button
              key={key}
              type="button"
              onClick={onClick}
              disabled={disabled}
              title={label}
              aria-label={label}
              onMouseEnter={() => setHoveredIcon(key)}
              onMouseLeave={() => setHoveredIcon(null)}
              style={{
                display: "flex",
                color:
                  !disabled && hoveredIcon === key ? WC.blue : WC.textMuted,
                cursor: disabled ? "default" : "pointer",
                opacity: disabled ? 0.4 : 1,
                transition: "color .15s ease",
              }}
            >
              <Icon size={16} />
            </Button>
          ))}
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: 16 }}>
          {/* ---- tabs ---- */}
          <div className="flex" style={{ position: "relative" }}>
            <Button
              type="button"
              onClick={() => setTab(ALL_TAB)}
              style={tabStyle(tab === ALL_TAB)}
            >
              {t("productForm.allCategories")}
            </Button>
            <Button
              type="button"
              onClick={() => setTab(MOST_USED_TAB)}
              style={tabStyle(tab === MOST_USED_TAB)}
            >
              {t("productForm.mostUsed")}
            </Button>
          </div>

          {/* ---- category list ---- */}
          <div
            style={{
              height: 240,
              overflowY: "auto",
              border: `1px solid ${WC.border}`,
              background: WC.card,
              padding: "4px 0",
            }}
          >
            {listContent()}
          </div>

          {/* ---- add / edit category ---- */}
          {!formOpen ? (
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
              className="wc-add-link"
              style={{
                marginTop: 12,
                fontSize: 13,
                color: WC.blue,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              {t("productForm.addNewCategory")}
            </Button>
          ) : (
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder={t("productForm.newCategoryName")}
                style={{ ...fieldStyle, marginTop: 16 }}
              />

              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{ ...fieldStyle, marginTop: 12 }}
              >
                <option value="">{t("productForm.parentCategoryOption")}</option>
                {parentOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {/* nbsp indentation: <option> ignores CSS padding */}
                    {"Â Â Â ".repeat(o.depth)}
                    {o.depth > 0 ? "â€” " : ""}
                    {o.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center" style={{ gap: 8 }}>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  onMouseEnter={() => setHoverSubmit(true)}
                  onMouseLeave={() => setHoverSubmit(false)}
                  className="flex items-center justify-center"
                  style={{
                    marginTop: 12,
                    height: 36,
                    padding: "0 18px",
                    borderRadius: 3,
                    border: `1px solid ${WC.blue}`,
                    background: hoverSubmit && !saving ? WC.blue : WC.card,
                    color: hoverSubmit && !saving ? WC.onBlue : WC.blue,
                    fontSize: 13,
                    cursor: saving ? "default" : "pointer",
                    opacity: saving ? 0.7 : 1,
                    transition: "background .15s ease, color .15s ease",
                  }}
                >
                  {saving ? (
                    <LoadingSpinner alt="..." width={16} />
                  ) : editingId ? (
                    t("productForm.updateCategoryBtn")
                  ) : (
                    t("productForm.addNewCategoryBtn")
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={closeForm}
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: WC.textMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t("productForm.cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Categories;
