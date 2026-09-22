import React from "react";

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

export default function BackgroundControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Type</span>
        <select value={value.type || "color"} onChange={(e) => handleChange('type', e.target.value)} style={inputStyle}>
          <option value="color">Couleur</option>
          <option value="image">Image</option>
          <option value="gradient">Gradient</option>
        </select>
      </label>
      {value.type === 'image' ? (
        <label style={{ display: 'block', marginBottom: 10, color: '#cbd5e1', fontSize: 12 }}>
          <span style={{ display: 'block', marginBottom: 4 }}>URL image</span>
          <input type="text" value={value.url || ''} onChange={(e) => handleChange('url', e.target.value)} style={inputStyle} />
        </label>
      ) : value.type === 'gradient' ? (
        <label style={{ display: 'block', marginBottom: 10, color: '#cbd5e1', fontSize: 12 }}>
          <span style={{ display: 'block', marginBottom: 4 }}>Gradient CSS</span>
          <input type="text" value={value.gradient || ''} onChange={(e) => handleChange('gradient', e.target.value)} style={inputStyle} placeholder="linear-gradient(...)" />
        </label>
      ) : (
        <label style={{ display: 'block', marginBottom: 10, color: '#cbd5e1', fontSize: 12 }}>
          <span style={{ display: 'block', marginBottom: 4 }}>Couleur</span>
          <input type="color" value={value.color || '#ffffff'} onChange={(e) => handleChange('color', e.target.value)} style={{ width: 64, height: 36, borderRadius: 8, border: '1px solid #374151', background: '#111827' }} />
        </label>
      )}
      <label style={{ display: 'block', color: '#cbd5e1', fontSize: 12 }}>
        <span style={{ display: 'block', marginBottom: 4 }}>Taille</span>
        <select value={value.size || 'cover'} onChange={(e) => handleChange('size', e.target.value)} style={inputStyle}>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="auto">Auto</option>
        </select>
      </label>
    </div>
  );
}
