export const ScrollTriggerTrait = (name = "scrollAnimation", label = "Animation au scroll") => ({
  name,
  label,
  type: "select",
  options: [
    { id: "none", name: "Aucune" },
    { id: "fade-in", name: "Apparition en fondu" },
    { id: "slide-up", name: "Glissement vers le haut" },
    { id: "slide-left", name: "Glissement depuis la droite" },
    { id: "zoom-in", name: "Zoom d'entré" },
  ],
  default: "none",
  changeProp: 1,
});
ScrollTriggerTrait.category = "advanced";

export const ScrollTriggerDelayTrait = (name = "scrollDelay", label = "Délai (ms)") => ({
  name,
  label,
  type: "number",
  default: 0,
  min: 0,
  step: 100,
  changeProp: 1,
});
ScrollTriggerDelayTrait.category = "advanced";
