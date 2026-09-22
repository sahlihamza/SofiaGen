import React from "react";

export default function FieldInput({ label, value = "", onChange, type = "text", options = [] }) {
  return (
    <label style={{ display: "block", marginBottom: 14, fontSize: 12, color: "#e5e7eb" }}>
      <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{label}</span>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
        >
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #374151", background: "#111827", color: "#f9fafb" }}
        />
      )}
    </label>
  );
}
