import React from "react";

export default function ColorPickerWithLabel({ label, value = "#ffffff", onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 10, fontSize: 12, color: "#e5e7eb" }}>
      <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{label}</span>
      <input
        type="color"
        value={value || "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 64, height: 36, borderRadius: 8, border: "1px solid #374151", padding: 0, background: "#111827" }}
      />
    </label>
  );
}
