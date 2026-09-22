import React from "react";

const SpacingControl = ({ label, value, onChange }) => (
  <label style={{ display: "block", marginBottom: 10, fontSize: 12, color: "#666" }}>
    <span style={{ display: "block", marginBottom: 4 }}>{label}</span>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%" }}
    />
  </label>
);

export default SpacingControl;
