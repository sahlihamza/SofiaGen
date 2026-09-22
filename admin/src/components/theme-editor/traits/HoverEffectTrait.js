export const HoverEffectTrait = (name = "hoverEffect", label = "Hover Effect") => ({
  name,
  label,
  type: "select",
  options: [
    { id: "none", name: "Aucun" },
    { id: "lift", name: "Soulévement (translateY)" },
    { id: "scale", name: "Zoom léger" },
    { id: "glow", name: "Lueur (box-shadow)" },
    { id: "underline", name: "Soulignement (liens/texte)" },
  ],
  default: "none",
  changeProp: 1,
});
HoverEffectTrait.category = "style";
