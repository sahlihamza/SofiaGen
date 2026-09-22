import React, { useState, useEffect } from "react";
import CategoryServices from "../../../../services/CategoryServices";
import ProductServices from "../../../../services/ProductServices";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { Button } from "@sofia/ui";

const MenuItemRow = ({ item, path, onUpdate, onRemove, onAddChild, onMoveUp, onMoveDown, canMoveUp, canMoveDown, depth = 0 }) => {
  const { pages } = useEditor();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const cats = await CategoryServices.getAllCategory();
        setCategories(Array.isArray(cats) ? cats : (cats.data || []));
      } catch (e) {
        console.error("Failed to load categories", e);
      }
      try {
        const prods = await ProductServices.getAllProducts({ page: 1, limit: 100 });
        setProducts(Array.isArray(prods) ? prods : (prods.data || []));
      } catch (e) {
        console.error("Failed to load products", e);
      }
    };
    loadOptions();
  }, []);

  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const maxDepth = 1;

  const update = (patch) => onUpdate(path, { ...item, ...patch });

  return (
    <div style={{ marginLeft: depth * 20, marginBottom: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#f9fafb" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            value={item.label || ""}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Label du lien"
            style={{ flex: 1, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          />
          <input
            type="text"
            value={item.icon || ""}
            onChange={(e) => update({ icon: e.target.value })}
            placeholder="IcÃ´ne (emoji)"
            style={{ width: 90, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 16, textAlign: "center" }}
          />
          {item.icon ? (
            <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22, textAlign: "center" }} aria-hidden="true">{item.icon}</span>
          ) : null}
          <select
            value={item.linkType || "url"}
            onChange={(e) => update({ linkType: e.target.value, pageId: null, categoryId: null, productId: null, url: "#" })}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, minWidth: 120 }}
          >
            <option value="page">Page</option>
            <option value="url">URL</option>
            <option value="category">CatÃ©gorie</option>
            <option value="product">Produit</option>
          </select>
        </div>

        {item.linkType === "page" && (
          <select
            value={item.pageId || ""}
            onChange={(e) => update({ pageId: e.target.value || null })}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          >
            <option value="">SÃ©lectionner une page</option>
            {pages?.map((p) => (
              <option key={p._id} value={p._id}>{p.name || p.title || p.slug}</option>
            ))}
          </select>
        )}

        {item.linkType === "url" && (
          <input
            type="text"
            value={item.url || ""}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://..."
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          />
        )}

        {item.linkType === "category" && (
          <select
            value={item.categoryId || ""}
            onChange={(e) => update({ categoryId: e.target.value || null })}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          >
            <option value="">SÃ©lectionner une catÃ©gorie</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        )}

        {item.linkType === "product" && (
          <select
            value={item.productId || ""}
            onChange={(e) => update({ productId: e.target.value || null })}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
          >
            <option value="">SÃ©lectionner un produit</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.productName || p.name || p._id}</option>
            ))}
          </select>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#374151" }}>
            <input
              type="checkbox"
              checked={!!item.openInNewTab}
              onChange={(e) => update({ openInNewTab: e.target.checked })}
            />
            Nouvel onglet
          </label>

          {hasChildren && (
            <>
              <select
                value={item.displayMode || "dropdown"}
                onChange={(e) => update({ displayMode: e.target.value })}
                style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }}
              >
                <option value="dropdown">Dropdown</option>
                <option value="mega">Mega Menu</option>
              </select>
              {item.displayMode === "mega" && (
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={item.megaColumns || 1}
                  onChange={(e) => update({ megaColumns: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)) })}
                  style={{ width: 60, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 12 }}
                  title="Colonnes (1-4)"
                />
              )}
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <Button onClick={() => onMoveUp(path)} disabled={!canMoveUp} style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, background: "white", cursor: canMoveUp ? "pointer" : "not-allowed", fontSize: 12 }}>â†‘</Button>
            <Button onClick={() => onMoveDown(path)} disabled={!canMoveDown} style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, background: "white", cursor: canMoveDown ? "pointer" : "not-allowed", fontSize: 12 }}>â†“</Button>

            {depth < maxDepth && (
              <Button onClick={() => onAddChild(path)} style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 12 }}>+ Sous-item</Button>
            )}
            <Button onClick={() => onRemove(path)} style={{ padding: "4px 8px", border: "1px solid #ef4444", borderRadius: 4, background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12 }}>ðŸ—‘ï¸</Button>

          </div>
        </div>
      </div>

      {hasChildren && (
        <div style={{ marginTop: 8, marginLeft: 16, borderLeft: "2px solid #e5e7eb", paddingLeft: 12 }}>
          {item.children.map((child, childIndex) => (
            <MenuItemRow
              key={child._id}
              item={child}
              path={[...path, childIndex]}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              canMoveUp={childIndex > 0}
              canMoveDown={childIndex < (item.children?.length || 0) - 1}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuItemRow;
