import { ImageTrait } from "../ImageTrait";
import { FONT_OPTIONS } from "../../core/fonts";

export function colorTraits({ prefix, fields, defaults = {}, section }) {
  const base = prefix || "";
  const compName = prefix ? `${prefix}Color` : "color";
  const compositeDefault = {};
  (fields || []).forEach((f) => {
    compositeDefault[f] = defaults[f] || "#000000";
  });
  const composite = {
    name: compName,
    label: `Couleurs ${prefix}`,
    type: "colors",
    fields: fields,
    default: compositeDefault,
    propertyMap: fields.reduce((acc, f) => {
      acc[f] = `${base}${capitalize(f)}Color`;
      return acc;
    }, {}),
    changeProp: 1,
    category: "style",
    section: section || "Couleurs",
  };
  const primitives = fields.map((field) => ({
    name: `${prefix}${capitalize(field)}Color`,
    label: `Couleur ${labelFor(field)} (${prefix})`,
    type: "color",
    default: defaults[field] || "#000000",
    changeProp: 1,
    category: "style",
    section: section || "Couleurs",
  }));
  return [composite, ...primitives];
}

export function spacingTraits({ prefix, defaults = {}, section }) {
  const base = prefix || "";
  const compName = prefix ? `${prefix}Spacing` : "spacing";
  return [
    {
      name: compName,
      label: `Espacement ${prefix}`,
      type: "spacing",
      default: {
        padding: defaults.padding ?? 16,
        gap: defaults.gap ?? 8,
      },
      propertyMap: {
        padding: `${base}Padding`,
        gap: `${base}Gap`,
      },
      changeProp: 1,
      category: "style",
      section: section || "Espacement",
    },
    { name: `${prefix}Padding`, label: `Padding ${prefix} (px)`, type: "number", default: defaults.padding ?? 16, min: 0, max: 80, changeProp: 1, category: "style", section: section || "Espacement" },
    { name: `${prefix}Gap`, label: `Espacement ${prefix} (px)`, type: "number", default: defaults.gap ?? 8, min: 0, max: 64, changeProp: 1, category: "style", section: section || "Espacement" },
  ];
}

export function borderTraits({ prefix = "", defaults = {}, section }) {
  const base = prefix || "border";
  return [
    {
      name: prefix ? `${prefix}Border` : "border",
      label: "Bordure",
      type: "border",
      default: {
        color: defaults.color || "#e5e7eb",
        width: defaults.width ?? 1,
        style: defaults.style || "solid",
        radius: defaults.radius ?? 8,
      },
      propertyMap: {
        color: `${base}BorderColor`,
        width: `${base}BorderWidth`,
        style: `${base}BorderStyle`,
        radius: `${base}BorderRadius`,
      },
      changeProp: 1,
      category: "style",
      section: section || "Bordure",
    },
  ];
}

export function typographyTraits({ prefix = "", defaults = {}, section }) {
  return [
    {
      name: prefix ? `${prefix}Typography` : "Typography",
      label: "Typographie",
      type: "typography",
      default: {
        fontSize: defaults.size ?? 16,
        fontWeight: defaults.weight || "600",
        textTransform: defaults.transform || "none",
      },
      propertyMap: {
        fontSize: `${prefix}FontSize`,
        fontWeight: `${prefix}FontWeight`,
        textTransform: `${prefix}TextTransform`,
      },
      changeProp: 1,
      category: "style",
      section: section || "Typographie",
    },
    {
      name: prefix ? `${prefix}FontFamily` : "fontFamily",
      label: "Police",
      type: "select",
      default: "inherit",
      options: FONT_OPTIONS,
      changeProp: 1,
      category: "style",
      section: section || "Typographie",
    },
  ];
}

export function animationTraits({ defaults = {}, section }) {
  return [
    { name: "animationType", label: "Animation", type: "select", options: [
      { value: "slide", label: "Slide" }, { value: "fade", label: "Fade" }, { value: "none", label: "Aucune" },
    ], default: defaults.type || "slide", changeProp: 1, category: "advanced", section: section || "Animation" },
    { name: "animationDuration", label: "Duré animation (ms)", type: "number", default: defaults.duration ?? 300, min: 0, max: 2000, changeProp: 1, category: "advanced", section: section || "Animation" },
  ];
}

export function shadowTraits({ prefix = "" } = {}, section) {
  return [
    {
      name: prefix ? `${prefix}Shadow` : "shadow",
      label: "Ombre",
      type: "shadow",
      default: {
        enabled: false,
        x: 0,
        y: 4,
        blur: 8,
        spread: 0,
        color: "rgba(0,0,0,0.15)",
        inset: false,
      },
      propertyMap: {
        enabled: `${prefix}ShadowEnabled`,
        x: `${prefix}ShadowX`,
        y: `${prefix}ShadowY`,
        blur: `${prefix}ShadowBlur`,
        spread: `${prefix}ShadowSpread`,
        color: `${prefix}ShadowColor`,
        inset: `${prefix}ShadowInset`,
      },
      changeProp: 1,
      category: "style",
      section: section || "Ombre",
    },
  ];
}

export function gradientTraits({ prefix = "" } = {}, section) {
  return [
    {
      name: prefix ? `${prefix}Gradient` : "gradient",
      label: "Dégradé",
      type: "gradient",
      default: {
        enabled: false,
        type: "linear",
        angle: 135,
        color1: "#667eea",
        color2: "#764ba2",
      },
      propertyMap: {
        enabled: `${prefix}GradientEnabled`,
        type: `${prefix}GradientType`,
        angle: `${prefix}GradientAngle`,
        color1: `${prefix}GradientColor1`,
        color2: `${prefix}GradientColor2`,
      },
      changeProp: 1,
      category: "style",
      section: section || "Dégradé",
    },
  ];
}

export function transformTraits({ prefix = "" } = {}, section) {
  return [
    {
      name: prefix ? `${prefix}Transform` : "transform",
      label: "Transformation",
      type: "transform",
      default: {
        rotate: 0,
        scale: 100,
        skewX: 0,
      },
      propertyMap: {
        rotate: `${prefix}Rotate`,
        scale: `${prefix}Scale`,
        skewX: `${prefix}SkewX`,
      },
      changeProp: 1,
      category: "advanced",
      section: section || "Transformation",
    },
  ];
}

export function backgroundImageTraits({ prefix = "" } = {}, section) {
  const base = prefix ? `${prefix}Bg` : "bg";
  return [
    {
      name: `${base}Image`,
      label: "Image de fond",
      type: "media-picker",
      changeProp: 1,
      category: "style",
      section: section || "Image de fond",
    },
    {
      name: `${base}Size`,
      label: "Taille",
      type: "select",
      default: "cover",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
        { value: "auto", label: "Auto" },
      ],
      changeProp: 1,
      category: "style",
      section: section || "Image de fond",
    },
    {
      name: `${base}Position`,
      label: "Position",
      type: "select",
      default: "center",
      options: [
        { value: "center", label: "Center" },
        { value: "top", label: "Top" },
        { value: "bottom", label: "Bottom" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
      changeProp: 1,
      category: "style",
      section: section || "Image de fond",
    },
  ];
}

export function withHoverVariant(traitFactory, args) {
  const normalTraits = traitFactory(args);
  const hoverTraits = normalTraits.map((t) => ({
    ...t,
    name: `${t.name}Hover`,
    label: `${t.label} (survol)`,
  }));
  return [...normalTraits, ...hoverTraits];
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function labelFor(field) {
  const map = { background: "fond", text: "texte", activeBackground: "fond actif", activeText: "texte actif" };
  return map[field] || field;
}
