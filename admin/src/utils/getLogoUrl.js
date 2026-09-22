import { getImageUrl } from "@/utils/getImageUrl";

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

export const getLogoUrl = (logo) => {
  if (!logo) return "";
  // Only treat it as a full URL if it strictly starts with http:// or https://
  if (ABSOLUTE_URL_REGEX.test(logo)) return logo;

  return getImageUrl(logo.startsWith("images/") ? logo : `images/${logo}`);
};
