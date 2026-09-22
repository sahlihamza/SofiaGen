import React from "react";

const ColorPicker = ({ label, value, onChange }) => (
  <label style={{ display: "block", marginBottom: 10, fontSize: 12, color: "#666" }}>
    <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid #ccc" }}
    />
  </label>
);

export default ColorPicker;
