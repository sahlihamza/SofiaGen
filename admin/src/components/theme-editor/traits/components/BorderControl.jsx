import React from "react";

const styles = ["solid", "dashed", "dotted", "none"];

export default function BorderControl({ label, value = {}, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Couleur</span>
          <input
            type="color"
            value={value.color || "#000000"}
            onChange={(e) => onChange({ ...value, color: e.target.value })}
            style={{ width: "100%", height: 36, borderRadius: 8, border: "1px solid #374151", background: "#111827" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>épaisseur</span>
          <input
            type="number"
            value={value.width ?? ""}
            onChange={(e) => onChange({ ...value, width: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Style</span>
          <select
            value={value.style ?? "solid"}
            onChange={(e) => onChange({ ...value, style: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          >
            {styles.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Radius</span>
          <input
            type="number"
            value={value.radius ?? ""}
            onChange={(e) => onChange({ ...value, radius: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          />
        </label>
      </div>
    </div>
  );
}
