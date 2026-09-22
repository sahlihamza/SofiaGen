export const humanizeNotificationType = (value) =>
  String(value || "")
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
