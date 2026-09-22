const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const diffFields = (before = {}, after = {}, prefix = "") => {
  const changes = [];
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    if (isPlainObject(beforeVal) || isPlainObject(afterVal)) {
      changes.push(...diffFields(beforeVal || {}, afterVal || {}, path));
      continue;
    }

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ field: path, from: beforeVal, to: afterVal });
    }
  }

  return changes;
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "vide";
  if (typeof value === "boolean") return value ? "oui" : "non";
  return String(value);
};

const formatDiffSummary = (changes, maxItems = 6) => {
  if (!changes || changes.length === 0) return "aucun changement détecté";

  const shown = changes
    .slice(0, maxItems)
    .map((c) => `${c.field}: "${formatValue(c.from)}"  "${formatValue(c.to)}"`)
    .join("; ");

  const remaining = changes.length - maxItems;
  return remaining > 0 ? `${shown} (+${remaining} autre(s))` : shown;
};

module.exports = { diffFields, formatDiffSummary };
