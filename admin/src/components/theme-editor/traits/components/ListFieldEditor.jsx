import React, { useEffect, useState } from "react";
import { useEditor } from "../../hooks/editor/EditorProvider";
import { IconPickerModal, IconDisplay, IconProvider } from "../../../icon-system";
import { Button } from "@sofia/ui";

/**
 * Reusable list editor used by traits that manage an array of structured items
 * (Tabs, Social Icons, Accordion, Pricing features, Team members...).
 *
 * Configuration via `itemSchema`:
 *   [{ key, label, type }]
 *   type: "text" | "textarea" | "url" | "icon" | "select" | "media-picker" | "icon-picker"
 */
export default function ListFieldEditor({
  items = [],
  itemSchema = [],
  onChange,
  addLabel = "+ Ajouter",
  emptyLabel = "Aucun Ã©lÃ©ment pour le moment.",

}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [localItems, setLocalItems] = useState(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const defaultItem = () =>
    itemSchema.reduce((acc, field) => {
      acc[field.key] = field.default !== undefined ? field.default : "";
      return acc;
    }, {});

  const commitChange = (next) => {
    setLocalItems(next);
    onChange(next);
  };

  const addItem = () => commitChange([...localItems, defaultItem()]);

  const updateItem = (index, patch) =>
    commitChange(localItems.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const removeItem = (index) =>
    commitChange(localItems.filter((_, i) => i !== index));

  const moveItem = (from, to) => {
    if (to < 0 || to >= localItems.length) return;
    const next = [...localItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commitChange(next);
  };

  const renderField = (field, value, index) => {
    const common = {
      value: value ?? "",
      onChange: (e) => updateItem(index, { [field.key]: e.target.value }),
      style: { width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #374151", background: "#0b1220", color: "#e5e7eb" },
    };

    if (field.type === "textarea") {
      return <textarea rows={3} {...common} />;
    }
    if (field.type === "number") {
      return <input type="number" {...common} onChange={(e) => updateItem(index, { [field.key]: e.target.value === "" ? "" : Number(e.target.value) })} />;
    }
    if (field.type === "select") {
      return (
        <select {...common} onChange={(e) => updateItem(index, { [field.key]: e.target.value })}>
          {(field.options || []).map((opt) => (
            <option key={opt.id ?? opt.value} value={opt.id ?? opt.value}>
              {opt.label ?? opt.name ?? opt.value}
            </option>
          ))}
        </select>
      );
    }
    if (field.type === "media-picker") {
      return <MediaPickerField value={value} onChange={(url) => updateItem(index, { [field.key]: url })} />;
    }
    if (field.type === "icon-picker") {
      return <IconPickerField value={value} onChange={(icon) => updateItem(index, { [field.key]: icon })} />;
    }
    return <input type={field.type === "url" ? "text" : "text"} {...common} />;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {localItems.length === 0 && (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>{emptyLabel}</p>
      )}

      {localItems.map((item, index) => (
        <div
          key={index}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== index) moveItem(dragIndex, index);
            setDragIndex(null);
          }}
          style={{
            border: "1px solid #374151",
            borderRadius: 8,
            padding: 8,
            background: "#111827",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1" }}>
              #{index + 1}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <Button
                type="button"
                title="Monter"
                onClick={() => moveItem(index, index - 1)}
                style={btnStyle}
                disabled={index === 0}
              >
                â†‘
              </Button>
              <Button

                type="button"
                title="Descendre"
                onClick={() => moveItem(index, index + 1)}
                style={btnStyle}
                disabled={index === localItems.length - 1}
              >
                â†“
              </Button>
              <Button

                type="button"
                title="Supprimer"
                onClick={() => removeItem(index)}
                style={{ ...btnStyle, color: "#fca5a5" }}
              >
                ðŸ—‘
              </Button>

            </div>
          </div>

          {itemSchema.map((field) => (
            <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{field.label}</span>
              {(() => {
                const value = item[field.key];
                return renderField(field, value, index);
              })()}
            </label>
          ))}
        </div>
      ))}

      <Button
        type="button"
        onClick={addItem}
        style={{
          border: "1px dashed #475569",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 12,
          color: "#93c5fd",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        {addLabel}
      </Button>
    </div>
  );
}

function MediaPickerField({ value, onChange }) {
  const { openMediaLibrary } = useEditor();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleOpenLibrary = () => {
    openMediaLibrary((asset) => {
      onChange(asset.src || asset.url);
    });
  };

  const handleDirectUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || "/api";
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "/");

      const res = await fetch(`${BASE_URL}/assets/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        onChange(data.url || data.src);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => onChange(evt.target.result);
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Direct upload error, using fallback Data URL", err);
      const reader = new FileReader();
      reader.onload = (evt) => onChange(evt.target.result);
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {value && (
        <img
          src={value}
          alt=""
          style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #374151" }}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.svg,.png,.jpg,.jpeg,.webp,.gif"
        onChange={handleDirectUpload}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: 4 }}>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{
            flex: 1,
            padding: "5px 6px",
            background: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {isUploading ? "Upload..." : "ðŸ“¤ TÃ©lÃ©verser"}
        </Button>
        <Button

          type="button"
          onClick={handleOpenLibrary}
          style={{
            flex: 1,
            padding: "5px 6px",
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          ðŸ–¼ï¸ MÃ©diathÃ¨que
        </Button>

      </div>
      {value && (
        <Button
          type="button"
          onClick={() => onChange("")}
          style={{
            fontSize: 10,
            color: "#ef4444",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textAlign: "left",
          }}
        >
          Retirer l'image
        </Button>
      )}
    </div>
  );
}

const btnStyle = {
  border: "1px solid #374151",
  borderRadius: 6,
  background: "#1f2937",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 12,
  padding: "2px 6px",
};

function IconPickerField({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const storeId = typeof window !== "undefined" ? window.__STORE_ID__ : null;

  const iconData = typeof selected === "string" ? null : selected;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "6px 8px",
          background: "#0b1220",
          border: "1px solid #374151",
          borderRadius: 6,
          color: "#e5e7eb",
          cursor: "pointer",
          fontSize: 12,
          textAlign: "left",
        }}
      >
        {iconData ? (
          <>
            <IconDisplay icon={iconData} size={16} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iconData.name}</span>
          </>
        ) : (
          <span style={{ color: "#94a3b8" }}>Choisir une icÃ´ne</span>
        )}
      </Button>
      <IconProvider storeId={storeId}>
        <IconPickerModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSelect={(icon) => {
            setSelected(icon);
            onChange(icon);
            setIsOpen(false);
          }}
          selectedIcon={iconData}
          storeId={storeId}
          size={16}
        />
      </IconProvider>
    </div>
  );
}
