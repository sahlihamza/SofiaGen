export const ClickEffectTrait = (name = "clickEffect", label = "Effet au clic") => ({
  name,
  label,
  type: "select",
  options: [
    { id: "", name: "Aucun" },
    { id: "pulse", name: "Pulse" },
    { id: "shake", name: "Secousse" },
    { id: "ripple", name: "Onde (ripple)" },
  ],
  default: "",
  changeProp: 1,
});
ClickEffectTrait.category = "style";
