export function generateHoverCss(component, { prefix, selector, componentUniqueClass, hoverTraits = [] }) {
  const rules = [];
  hoverTraits.forEach(({ traitSuffix, cssProperty }) => {
    const traitName = `${prefix}${traitSuffix}Hover`;
    const value = component.get(traitName);
    if (value) rules.push(`${cssProperty}: ${value};`);
  });
  if (!rules.length) return "";
  return `.${componentUniqueClass} ${selector}:hover { ${rules.join(" ")} }`;
}

export function ensureInstanceStyleTag(doc, componentId) {
  const id = `instance-style-${componentId}`;
  let styleTag = doc.getElementById(id);
  if (!styleTag) {
    styleTag = doc.createElement("style");
    styleTag.id = id;
    doc.head.appendChild(styleTag);
  }
  return styleTag;
}
