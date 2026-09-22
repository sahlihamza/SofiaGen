export const OpacityTrait = (name = "opacity", label = "Opacity", defaultValue = 1) => ({
  name,
  label,
  type: "range",
  min: 0,
  max: 1,
  step: 0.1,
  default: defaultValue,
  changeProp: 1,
});
OpacityTrait.category = "style";
