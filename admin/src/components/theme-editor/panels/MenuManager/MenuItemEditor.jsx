import React, { useState, useEffect } from "react";
import MenuItemRow from "./MenuItemRow";
import { insertAtPath, updateAtPath, removeAtPath, reorderItem } from "./treeHelpers";
import ThemeEditorServices from "../../../../services/ThemeEditorServices";
import { Button } from "@sofia/ui";

const MenuItemEditor = ({ menu, onClose }) => {
  const [items, setItems] = useState(menu?.items || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(menu?.items || []);
  }, [menu?._id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ThemeEditorServices.updateMenu(menu._id, { items });
      onClose?.();
    } catch (err) {
      console.error("Failed to save menu items:", err);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (parentPath = []) => {
    const newItem = {
      _id: `tmp-${Date.now()}`,
      label: "Nouveau lien",
      icon: "",
      linkType: "url",
      url: "#",
      openInNewTab: false,
      displayOrder: 0,
      children: [],
    };
    setItems((prev) => insertAtPath(prev, parentPath, newItem));
  };

  const updateItem = (path, patch) => {
    setItems((prev) => updateAtPath(prev, path, patch));
  };

  const removeItem = (path) => {
    setItems((prev) => removeAtPath(prev, path));
  };

  const moveUp = (path) => {
    if (path.length === 0) return;
    setItems((prev) => reorderItem(prev, path, -1));
  };

  const moveDown = (path) => {
    if (path.length === 0) return;
    setItems((prev) => reorderItem(prev, path, 1));
  };

  const getCanMoveUp = (path) => path.length > 0 && path[path.length - 1] > 0;
  const getCanMoveDown = (path) => {
    if (path.length === 0) return false;
    const siblings = path.length === 1 ? items : items[path[0]]?.children || [];
    return path[path.length - 1] < siblings.length - 1;
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Ã‰diteur du menu : {menu?.name}</h3>

          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>Location: {menu?.location}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={() => addItem([])} style={{ padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 }}>+ Ajouter un lien</Button>
          <Button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", border: "none", borderRadius: 6, background: "#059669", color: "white", cursor: "pointer", fontSize: 13, opacity: saving ? 0.7 : 1 }}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8 }}>
        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: 8 }}>
            Aucun lien dans ce menu. Cliquez sur "+ Ajouter un lien" pour commencer.
          </div>
        )}
        {items.map((item, i) => (
          <MenuItemRow
            key={item._id}
            item={item}
            path={[i]}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAddChild={addItem}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            canMoveUp={getCanMoveUp([i])}
            canMoveDown={getCanMoveDown([i])}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
};

export default MenuItemEditor;
