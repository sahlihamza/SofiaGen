const path = require("path");

function sanitizeSvg(svgString) {
  return svgString
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function extractSvgNameFromFilename(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .substring(0, 60);
}

function parseSvgString(svgString) {
  const trimmed = svgString.trim();
  if (!trimmed.startsWith("<svg")) return null;

  const viewBoxMatch = trimmed.match(/viewBox=["']([^"']+)["']/);
  const widthMatch = trimmed.match(/width=["']([^"']+)["']/);
  const heightMatch = trimmed.match(/height=["']([^"']+)["']/);

  const innerContent = trimmed.replace(/<svg[^>]*>|<\/svg>/gi, "").trim();

  return {
    viewBox: viewBoxMatch ? viewBoxMatch[1] : "0 0 24 24",
    width: widthMatch ? parseInt(widthMatch[1], 10) : 24,
    height: heightMatch ? parseInt(heightMatch[1], 10) : 24,
    content: innerContent,
  };
}

module.exports = { sanitizeSvg, extractSvgNameFromFilename, parseSvgString };
