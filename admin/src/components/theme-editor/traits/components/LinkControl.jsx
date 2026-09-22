import React from "react";

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

export default function LinkControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>URL</span>
        <input type="text" value={value.href || ""} onChange={(e) => handleChange("href", e.target.value)} style={inputStyle} placeholder="https://..." />
      </label>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Texte du lien</span>
        <input type="text" value={value.text || ""} onChange={(e) => handleChange("text", e.target.value)} style={inputStyle} />
      </label>
      <label style={{ display: "block", color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Cible</span>
        <select value={value.target || "_self"} onChange={(e) => handleChange("target", e.target.value)} style={inputStyle}>
          <option value="_self">Méme onglet</option>
          <option value="_blank">Nouvel onglet</option>
        </select>
      </label>
    </div>
  );
}
