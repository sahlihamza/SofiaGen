import React from "react";

const options = [
  { label: "Aucune", value: "none" },
  { label: "Opacité", value: "opacity" },
  { label: "Souligner", value: "underline" },
  { label: "élever", value: "lift" },
];

export default function HoverControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Effet</span>
        <select value={value.effect || "none"} onChange={(e) => handleChange("effect", e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Duré (ms)</span>
        <input type="number" value={value.duration ?? ''} onChange={(e) => handleChange('duration', e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#f9fafb' }} />
      </label>
    </div>
  );
}
