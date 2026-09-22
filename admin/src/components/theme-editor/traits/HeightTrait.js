export const HeightTrait = (name = "height", label = "Height (px)", defaultValue = 500) => ({
  name,
  label,
  type: "number",
  changeProp: 1,
  default: defaultValue,
});
HeightTrait.category = "style";
