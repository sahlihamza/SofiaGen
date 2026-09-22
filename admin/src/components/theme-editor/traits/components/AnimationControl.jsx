import React from "react";

const types = ["none", "fade", "slide", "scale"];

export default function AnimationControl({ label, value = {}, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Type</span>
          <select
            value={value.type ?? "none"}
            onChange={(e) => onChange({ ...value, type: e.target.value })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          >
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#cbd5e1" }}>
          <span>Duré (ms)</span>
          <input
            type="number"
            value={value.duration ?? ""}
            onChange={(e) => onChange({ ...value, duration: Number(e.target.value) })}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
          />
        </label>
      </div>
    </div>
  );
}
