// Simple deep merge utility for merging global component data with per-page overrides
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function mergeGlobalComponent(section, globalComponent) {
  if (!globalComponent || !globalComponent.componentData) return section.componentData || {};
  const base = globalComponent.componentData || {};
  const overrides = section.overrides || {};
  return deepMerge(base, overrides);
}

module.exports = { mergeGlobalComponent };
