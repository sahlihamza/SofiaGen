import React from "react";
import ColorPickerWithLabel from "./ColorPickerWithLabel";

export default function ColorsControl({ label, value = {}, fields = [], onChange }) {
  const local = { ...(value || {}) };

  const updateField = (field, val) => {
    local[field] = val;
    onChange({ ...local });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#e5e7eb", fontWeight: 600 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {(fields || []).map((f) => (
          <div key={f}>
            <ColorPickerWithLabel label={f.charAt(0).toUpperCase() + f.slice(1)} value={local[f] || "#000000"} onChange={(v) => updateField(f, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
