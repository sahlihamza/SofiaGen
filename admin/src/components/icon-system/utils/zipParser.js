import JSZip from "jszip";
import { parseSvgString, sanitizeSvg, extractSvgNameFromFilename } from "./svgParser";

export async function parseZipFile(file) {
  const zip = await JSZip.loadAsync(file);
  const icons = [];
  const errors = [];

  const svgFiles = Object.keys(zip.files).filter((f) => f.endsWith(".svg") && !zip.files[f].dir);

  for (const filename of svgFiles) {
    try {
      const content = await zip.files[filename].async("string");
      const sanitized = sanitizeSvg(content);
      const parsed = parseSvgString(sanitized);
      if (!parsed) {
        errors.push({ filename, error: "invalid_svg" });
        continue;
      }
      const name = extractSvgNameFromFilename(filename);
      icons.push({
        name,
        filename: filename.split("/").pop(),
        svgContent: sanitized,
        tags: [name.split("-")[0]],
        viewBox: parsed.viewBox,
        width: parsed.width,
        height: parsed.height,
      });
    } catch (err) {
      errors.push({ filename, error: err.message });
    }
  }

  return { icons, errors };
}

export async function parseIcoMoonJson(file) {
  const text = await file.text();
  const json = JSON.parse(text);

  if (!json.icons || !Array.isArray(json.icons)) {
    throw new Error("Invalid IcoMoon JSON: missing icons array");
  }

  const icons = json.icons.map((ico) => {
    const paths = ico.paths?.map((p) => `<path d="${p}" fill="currentColor"/>`).join("") || "";
    const svg = `<svg viewBox="0 0 ${ico.icon?.width || 1024} ${ico.icon?.height || 1024}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
    return {
      name: ico.properties?.name || `icon-${ico.properties?.id}`,
      svgContent: svg,
      tags: [ico.properties?.name?.split("-")[0] || "icomoon"],
      viewBox: `0 0 ${ico.icon?.width || 1024} ${ico.icon?.height || 1024}`,
    };
  });

  return { icons, errors: [], metadata: json };
}
