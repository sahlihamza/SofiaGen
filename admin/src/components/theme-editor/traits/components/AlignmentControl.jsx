import React from "react";
import { Button } from "@sofia/ui";


const options = [
  { label: "Gauche", value: "left" },
  { label: "Centre", value: "center" },
  { label: "Droite", value: "right" },
  { label: "JustifiÃ©", value: "justify" },
];

export default function AlignmentControl({ label, value = "left", onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: value === option.value ? "1px solid #60a5fa" : "1px solid #374151",
              background: value === option.value ? "#1e3a8a" : "#111827",
              color: "#f9fafb",
              cursor: "pointer",
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
