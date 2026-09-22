import React from "react";

const inputStyle = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid #374151",
  background: "#111827",
  color: "#f9fafb",
};

const presets = [
  { label: "Aucune", value: "none" },
  { label: "Douce", value: "0 1px 3px rgba(0,0,0,0.12)" },
  { label: "Moyenne", value: "0 4px 10px rgba(0,0,0,0.15)" },
  { label: "Forte", value: "0 10px 30px rgba(0,0,0,0.2)" },
];

export default function BoxShadowControl({ label, value = {}, onChange }) {
  const handleChange = (key, next) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>{label}</div>
      <label style={{ display: "block", marginBottom: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Preset</span>
        <select value={value.preset || ""} onChange={(e) => handleChange("preset", e.target.value)} style={inputStyle}>
          <option value="">Personnalisé</option>
          {presets.map((preset) => (
            <option key={preset.value} value={preset.value}>{preset.label}</option>
          ))}
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Offset X</span>
          <input type="number" value={value.offsetX ?? ''} onChange={(e) => handleChange('offsetX', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Offset Y</span>
          <input type="number" value={value.offsetY ?? ''} onChange={(e) => handleChange('offsetY', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Flou</span>
          <input type="number" value={value.blur ?? ''} onChange={(e) => handleChange('blur', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1', fontSize: 12 }}>
          <span>Spread</span>
          <input type="number" value={value.spread ?? ''} onChange={(e) => handleChange('spread', e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
        </label>
      </div>
      <label style={{ display: "block", marginTop: 10, color: "#cbd5e1", fontSize: 12 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Couleur</span>
        <input type="color" value={value.color || "#000000"} onChange={(e) => handleChange('color', e.target.value)} style={{ width: 64, height: 36, borderRadius: 8, border: "1px solid #374151", background: "#111827" }} />
      </label>
    </div>
  );
}
