export const ImageTrait = (name = "image", label = "Image") => ({
  name,
  label,
  type: "media-picker",
  changeProp: 1,
  category: "content",
});
ImageTrait.category = "content";
