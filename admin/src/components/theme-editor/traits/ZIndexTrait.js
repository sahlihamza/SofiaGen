export const ZIndexTrait = (name = "zIndex", label = "Z-index") => ({
  name,
  label,
  type: "number",
  default: 0,
  step: 1,
  changeProp: 1,
  category: "advanced",
});
