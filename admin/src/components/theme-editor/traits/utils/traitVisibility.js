const VISIBILITY_RULES = {
  BorderWidth: (component, prefix) => component.get(`${prefix}BorderStyle`) !== "none",
  BorderRadius: (component, prefix) => component.get(`${prefix}BorderStyle`) !== "none",
  BorderColor: (component, prefix) => component.get(`${prefix}BorderStyle`) !== "none",

  GradientType: (component, prefix) => component.get(`${prefix}GradientEnabled`),
  GradientAngle: (component, prefix) => component.get(`${prefix}GradientEnabled`) && component.get(`${prefix}GradientType`) === "linear",
  GradientColor1: (component, prefix) => component.get(`${prefix}GradientEnabled`),
  GradientColor2: (component, prefix) => component.get(`${prefix}GradientEnabled`),

  ShadowX: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
  ShadowY: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
  ShadowBlur: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
  ShadowSpread: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
  ShadowColor: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
  ShadowInset: (component, prefix) => component.get(`${prefix}ShadowEnabled`),
};

export function isTraitVisible(trait, component) {
  const fullName = trait.get("name");
  const match = Object.keys(VISIBILITY_RULES).find((suffix) => fullName.endsWith(suffix));
  if (!match) return true;

  const prefix = fullName.slice(0, fullName.length - match.length);
  try {
    return VISIBILITY_RULES[match](component, prefix);
  } catch (e) {
    return true;
  }
}
