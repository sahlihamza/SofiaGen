import React from "react";

export default function TypographyControl({ label, value = {}, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Taille</span>
          <input
            type="number"
            value={value.fontSize ?? ""}
            onChange={(e) => onChange({ ...value, fontSize: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Poids</span>
          <select
            value={value.fontWeight ?? ""}
            onChange={(e) => onChange({ ...value, fontWeight: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          >
            <option value="">Automatique</option>
            <option value="400">400</option>
            <option value="500">500</option>
            <option value="600">600</option>
            <option value="700">700</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Alignement</span>
          <select
            value={value.textAlign ?? ""}
            onChange={(e) => onChange({ ...value, textAlign: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          >
            <option value="">Automatique</option>
            <option value="left">left</option>
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
        </label>
      </div>
    </div>
  );
}
