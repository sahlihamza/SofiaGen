const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

export const getImageUrl = (image) => {
  if (!image) return "";
  if (ABSOLUTE_URL_REGEX.test(image)) return image;

  const apiBase = import.meta.env.VITE_APP_API_BASE_URL || "";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}/static/${image}`;
};
