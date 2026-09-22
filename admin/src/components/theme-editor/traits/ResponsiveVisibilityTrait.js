export const ResponsiveVisibilityTrait = (name = "responsiveVisibility", label = "Visibilité responsive") => ({
  name,
  label,
  type: "responsiveVisibility",
  default: {
    desktop: false,
    tablet: false,
    mobile: false,
  },
  changeProp: 1,
  category: "advanced",
});
