import React from "react";

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

export default function TransformControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => onChange({ ...value, [key]: next });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Translation X</span>
          <input type="number" value={value.translateX ?? ''} onChange={(e) => handleChange('translateX', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Translation Y</span>
          <input type="number" value={value.translateY ?? ''} onChange={(e) => handleChange('translateY', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>échelle</span>
          <input type="number" step="0.1" value={value.scale ?? ''} onChange={(e) => handleChange('scale', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Rotation</span>
          <input type="number" value={value.rotate ?? ''} onChange={(e) => handleChange('rotate', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Inclinaison</span>
          <input type="number" value={value.skew ?? ''} onChange={(e) => handleChange('skew', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
      </div>
    </div>
  );
}
