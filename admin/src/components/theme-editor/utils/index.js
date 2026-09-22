export const formatThemeId = (id) => id?.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "";
