export const ParallaxTrait = (name = "parallaxIntensity", label = "Intensité Parallax") => ({
  name,
  label,
  type: "number",
  default: 0,
  min: 0,
  max: 100,
  changeProp: 1,
});
ParallaxTrait.category = "style";
