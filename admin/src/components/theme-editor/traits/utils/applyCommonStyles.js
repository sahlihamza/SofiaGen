export function applyColorStyle(rootEl, component, { prefix, selector, fields }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Color`) || {};
  fields.forEach((field) => {
    const traitName = `${prefix}${capitalize(field)}Color`;
    const value = (composite && composite[field] !== undefined) ? composite[field] : component.get(traitName);
    if (value === undefined) return;
    target.forEach((el) => { el.style[fieldToCssProp(field)] = value; });
  });
}

export function applyBorderStyle(rootEl, component, { prefix = "", selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Border`) || {};
  const color = composite.color ?? component.get(`${prefix}BorderColor`) ?? component.get(`${prefix}Color`);
  const width = composite.width ?? component.get(`${prefix}BorderWidth`) ?? component.get(`${prefix}Width`);
  const style = composite.style ?? component.get(`${prefix}BorderStyle`) ?? component.get(`${prefix}Style`);
  const radius = composite.radius ?? component.get(`${prefix}BorderRadius`) ?? component.get(`${prefix}Radius`);
  target.forEach((el) => {
    if (color !== undefined) el.style.borderColor = color;
    if (width !== undefined) el.style.borderWidth = `${width}px`;
    if (style !== undefined) el.style.borderStyle = style;
    if (radius !== undefined) el.style.borderRadius = `${radius}px`;
  });
}

export function applyTypographyStyle(rootEl, component, { prefix, selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Typography`) || {};
  const size = composite.fontSize ?? component.get(`${prefix}FontSize`);
  const weight = composite.fontWeight ?? component.get(`${prefix}FontWeight`);
  const transform = composite.textTransform ?? component.get(`${prefix}TextTransform`);
  const family = component.get(`${prefix}FontFamily`);
  target.forEach((el) => {
    if (size !== undefined) el.style.fontSize = `${size}px`;
    if (weight !== undefined) el.style.fontWeight = weight;
    if (transform !== undefined) el.style.textTransform = transform;
    if (family && family !== "inherit") el.style.fontFamily = family;
  });
}

export function applyShadowStyle(rootEl, component, { prefix = "", selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Shadow`) || {};
  const enabled = composite.enabled ?? component.get(`${prefix}ShadowEnabled`);
  target.forEach((el) => {
    if (!enabled) { el.style.boxShadow = "none"; return; }
    const x = composite.x ?? component.get(`${prefix}ShadowX`) ?? 0;
    const y = composite.y ?? component.get(`${prefix}ShadowY`) ?? 4;
    const blur = composite.blur ?? component.get(`${prefix}ShadowBlur`) ?? 8;
    const spread = composite.spread ?? component.get(`${prefix}ShadowSpread`) ?? 0;
    const color = composite.color ?? component.get(`${prefix}ShadowColor`) ?? "rgba(0,0,0,0.15)";
    const inset = (composite.inset ?? component.get(`${prefix}ShadowInset`)) ? "inset " : "";
    el.style.boxShadow = `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
  });
}

export function applyGradientStyle(rootEl, component, { prefix = "", selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Gradient`) || {};
  const enabled = composite.enabled ?? component.get(`${prefix}GradientEnabled`);
  if (!enabled) return;
  const type = composite.type ?? (component.get(`${prefix}GradientType`) || "linear");
  const angle = composite.angle ?? component.get(`${prefix}GradientAngle`) ?? 135;
  const c1 = composite.color1 ?? (component.get(`${prefix}GradientColor1`) || "#667eea");
  const c2 = composite.color2 ?? (component.get(`${prefix}GradientColor2`) || "#764ba2");
  const value = type === "radial"
    ? `radial-gradient(circle, ${c1}, ${c2})`
    : `linear-gradient(${angle}deg, ${c1}, ${c2})`;
  target.forEach((el) => { el.style.background = value; });
}

export function applyTransformStyle(rootEl, component, { prefix = "", selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Transform`) || {};
  const rotate = composite.rotate ?? component.get(`${prefix}Rotate`) ?? 0;
  const scale = (composite.scale ?? component.get(`${prefix}Scale`) ?? 100) / 100;
  const skew = composite.skewX ?? component.get(`${prefix}SkewX`) ?? 0;
  target.forEach((el) => {
    el.style.transform = `rotate(${rotate}deg) scale(${scale}) skewX(${skew}deg)`;
  });
}

export function applyBackgroundImageStyle(rootEl, component, { prefix = "", selector }) {
  const target = rootEl.querySelectorAll(selector);
  const composite = component.get(`${prefix}Bg`) || {};
  const image = component.get(`${prefix}BgImage`) !== undefined ? component.get(`${prefix}BgImage`) : composite.url;
  const size = component.get(`${prefix}BgSize`) !== undefined ? component.get(`${prefix}BgSize`) : (composite.size || "cover");
  const position = component.get(`${prefix}BgPosition`) !== undefined ? component.get(`${prefix}BgPosition`) : (composite.position || "center");
  target.forEach((el) => {
    if (!image) { el.style.backgroundImage = "none"; return; }
    el.style.backgroundImage = `url('${image}')`;
    el.style.backgroundSize = size;
    el.style.backgroundPosition = position;
  });
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fieldToCssProp(field) {
  return field.toLowerCase().includes("background") ? "background" : "color";
}
