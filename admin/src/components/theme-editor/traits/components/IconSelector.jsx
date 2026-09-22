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

const defaultIcons = [
  "star",
  "heart",
  "user",
  "check",
  "phone",
  "email",
  "map-pin",
  "settings",
];

export default function IconSelector({ label, value = "", onChange, icons = defaultIcons }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gap: 8 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom d'icÃ´ne"
          style={inputStyle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {icons.map((icon) => (
            <Button
              key={icon}
              type="button"
              onClick={() => onChange(icon)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: value === icon ? "1px solid #60a5fa" : "1px solid #374151",
                background: value === icon ? "#1e3a8a" : "#111827",
                color: "#f9fafb",
                cursor: "pointer",
              }}
            >
              {icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
