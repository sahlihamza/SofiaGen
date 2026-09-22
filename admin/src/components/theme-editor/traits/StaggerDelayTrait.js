export const StaggerDelayTrait = (name = "staggerDelay", label = "Délai en cascade (ms)") => ({
  name,
  label,
  type: "number",
  default: 0,
  min: 0,
  max: 1000,
  changeProp: 1,
});
StaggerDelayTrait.category = "advanced";
