// productGallery can now come from the backend as either an array of strings
// (legacy) or an array of GalleryProduct objects { _id, product, image, order, isPrimary }.
// These helpers normalize both shapes so the UI only ever deals with URL strings.

const getGalleryItemPrimaryFlag = (item) => Boolean(item?.isPrimary || item?.primary);

const normalizeImageString = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const baseUrl = import.meta?.env?.VITE_APP_API_BASE_URL;
  if (baseUrl && trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  return trimmed;
};

// Extract the image URL from a single gallery item (string or object).
export const getGalleryImage = (item) => {
  if (!item) return "";

  if (typeof item === "string") return normalizeImageString(item);

  const rawValue =
    item?.image ||
    item?.imageUrl ||
    item?.url ||
    item?.secure_url ||
    item?.src ||
    item?.path ||
    item?.file ||
    item?.image?.url ||
    item?.image?.secure_url ||
    item?.image?.path ||
    item?.image?.src ||
    "";

  return normalizeImageString(rawValue);
};

// Resolve the main/primary image from either a product object or a gallery array.
export const getPrimaryGalleryImage = (productOrGallery) => {
  if (!productOrGallery) return "";

  if (typeof productOrGallery === "string") return normalizeImageString(productOrGallery);

  if (Array.isArray(productOrGallery)) {
    const primaryItem = productOrGallery.find(
      (item) => item?.isPrimary || item?.primary
    );
    return getGalleryImage(primaryItem || productOrGallery[0]) || "";
  }

  if (productOrGallery.productImage) {
    return getGalleryImage(productOrGallery.productImage) || "";
  }

  const gallery = Array.isArray(productOrGallery.productGallery)
    ? productOrGallery.productGallery
    : [];
  const primaryItem = gallery.find((item) => item?.isPrimary || item?.primary);
  return getGalleryImage(primaryItem || gallery[0]) || "";
};

// Normalize a whole productGallery into an ordered array of URL strings.
// Primary image comes first, then the remaining images ordered by their backend order value.
export const getGalleryImages = (gallery) => {
  if (!Array.isArray(gallery)) return [];

  return [...gallery]
    .sort((a, b) => {
      const aPrimary = getGalleryItemPrimaryFlag(a);
      const bPrimary = getGalleryItemPrimaryFlag(b);

      if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
      return (a?.order ?? 0) - (b?.order ?? 0);
    })
    .map(getGalleryImage)
    .filter(Boolean);
};

// Build the payload expected by the backend for gallery entries.
// The main image is flagged as primary and the rest are secondary entries.
export const buildGalleryPayload = (mainImage, extraGallery = []) => {
  const items = [];

  if (mainImage) {
    items.push({ image: mainImage, isPrimary: true, order: 0 });
  }

  (Array.isArray(extraGallery) ? extraGallery : [])
    .filter(Boolean)
    .forEach((image, index) => {
      items.push({ image, isPrimary: false, order: index + 1 });
    });

  return items;
};
