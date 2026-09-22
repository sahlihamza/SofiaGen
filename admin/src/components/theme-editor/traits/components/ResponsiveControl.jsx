import React from "react";

const controlStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

export default function ResponsiveControl({ label, value = {}, onChange, unit = "px" }) {
  const handleChange = (device, next) => {
    onChange({ ...value, [device]: next });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {['desktop', 'tablet', 'mobile'].map((device) => (
          <label key={device} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', color: '#cbd5e1', fontSize: 12 }}>
            <span style={{ textTransform: 'capitalize', minWidth: 68 }}>{device}</span>
            <div style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input
                type="number"
                value={value[device] ?? ''}
                onChange={(e) => handleChange(device, e.target.value === '' ? '' : Number(e.target.value))}
                style={controlStyle}
              />
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 10px', borderRadius: 8, background: '#1f2937', color: '#94a3b8' }}>{unit}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
