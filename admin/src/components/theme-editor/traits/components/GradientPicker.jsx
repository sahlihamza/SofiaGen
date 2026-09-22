import React from "react";
import { Button } from "@sofia/ui";


const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

const presets = [
  { label: "DÃ©gradÃ© bleu", value: "linear-gradient(135deg, #3b82f6 0%, #9333ea 100%)" },
  { label: "DÃ©gradÃ© chaud", value: "linear-gradient(135deg, #f97316 0%, #facc15 100%)" },
  { label: "DÃ©gradÃ© frais", value: "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)" },
];

export default function GradientPicker({ label, value = "", onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>CSS DÃ©gradÃ©</span>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} placeholder="linear-gradient(...)" />
      </label>
      <div style={{ display: "grid", gap: 8 }}>
        {presets.map((preset) => (
          <Button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: value === preset.value ? "1px solid #60a5fa" : "1px solid #374151",
              background: value === preset.value ? "#1e3a8a" : "#111827",
              color: "#f9fafb",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ marginBottom: 6, fontSize: 12 }}>{preset.label}</div>
            <div style={{ width: "100%", height: 32, borderRadius: 8, background: preset.value }} />
          </Button>
        ))}
      </div>
    </div>
  );
}
