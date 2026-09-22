import React from "react";

const textareaStyle = {
  width: "100%",
  minHeight: 100,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
  fontFamily: "monospace",
  fontSize: 12,
};

export default function AdvancedCSSControl({ label, value = "", onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Entrer du CSS personnalisé..."
        style={textareaStyle}
      />
    </div>
  );
}
