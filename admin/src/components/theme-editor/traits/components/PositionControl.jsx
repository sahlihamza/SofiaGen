import React from "react";

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

export default function PositionControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Position</span>
          <select value={value.position || 'static'} onChange={(e) => handleChange('position', e.target.value)} style={inputStyle}>
            <option value="static">Static</option>
            <option value="relative">Relative</option>
            <option value="absolute">Absolute</option>
            <option value="fixed">Fixed</option>
            <option value="sticky">Sticky</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Top</span>
          <input type="number" value={value.top ?? ''} onChange={(e) => handleChange('top', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Left</span>
          <input type="number" value={value.left ?? ''} onChange={(e) => handleChange('left', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Right</span>
          <input type="number" value={value.right ?? ''} onChange={(e) => handleChange('right', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Bottom</span>
          <input type="number" value={value.bottom ?? ''} onChange={(e) => handleChange('bottom', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Z-index</span>
          <input type="number" value={value.zIndex ?? ''} onChange={(e) => handleChange('zIndex', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
      </div>
    </div>
  );
}
