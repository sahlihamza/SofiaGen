import React from "react";

const ShadowControl = ({ label, value, onChange }) => (
  <label style={{ display: "block", marginBottom: 10, fontSize: 12, color: "#666" }}>
    <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. 0px 4px 10px rgba(0,0,0,0.15)"
      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
    />
  </label>
);

export default ShadowControl;
