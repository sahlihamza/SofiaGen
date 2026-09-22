import React from "react";

const sides = ["top", "right", "bottom", "left"];

export default function SpacingControl({ label, value = {}, onChange }) {
  const handleChange = (key, val) => {
    onChange({ ...value, [key]: val });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        {sides.map((side) => (
          <label key={side} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
            <span style={{ textTransform: "capitalize" }}>{side}</span>
            <input
              type="number"
              value={value[side] ?? 0}
              onChange={(e) => handleChange(side, Number(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
