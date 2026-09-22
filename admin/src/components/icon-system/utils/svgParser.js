export function parseSvgString(svgString) {
  const trimmed = svgString.trim();
  if (!trimmed.startsWith("<svg")) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return null;

  const viewBox = svgEl.getAttribute("viewBox") || "0 0 24 24";
  const width = svgEl.getAttribute("width") || "24";
  const height = svgEl.getAttribute("height") || "24";
  const innerSvg = svgEl.innerHTML.trim();

  return {
    viewBox,
    width: Number.parseInt(width, 10) || 24,
    height: Number.parseInt(height, 10) || 24,
    content: innerSvg,
  };
}

export function svgToReactComponent(svgData) {
  return {
    viewBox: svgData.viewBox,
    width: svgData.width,
    height: svgData.height,
    content: svgData.content,
  };
}

export function sanitizeSvg(svgString) {
  return svgString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function extractSvgNameFromFilename(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .substring(0, 60);
}
