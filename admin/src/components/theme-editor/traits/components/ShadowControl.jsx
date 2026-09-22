import React from "react";

const presets = [
  { label: "Aucune", value: "none" },
  { label: "Douce", value: "0 1px 3px rgba(0,0,0,0.1)" },
  { label: "Moyenne", value: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  { label: "Forte", value: "0 10px 15px -3px rgba(0,0,0,0.1)" },
];

export default function ShadowControl({ label, value = "none", onChange }) {
  return (
    <label style={{ display: "block", marginBottom: 14, fontSize: 12, color: "#e5e7eb" }}>
      <span style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
      >
        {presets.map((preset) => (
          <option key={preset.value} value={preset.value}>{preset.label}</option>
        ))}
      </select>
    </label>
  );
}
