export const CustomIdTrait = (name = "customId", label = "ID de l'Élément") => ({
  name,
  label,
  type: "text",
  placeholder: "identifiant unique",
  changeProp: 1,
  category: "advanced",
});
