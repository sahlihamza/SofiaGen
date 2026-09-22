import React from "react";

const options = [
  { label: "Visible", value: "visible" },
  { label: "Masqué", value: "hidden" },
  { label: "Caché" , value: "collapse" },
];

export default function VisibilityControl({ label, value = "visible", onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
