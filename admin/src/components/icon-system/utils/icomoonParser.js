export async function parseIcoMoonJson(file) {
  const text = await file.text();
  const json = JSON.parse(text);

  if (!json.icons || !Array.isArray(json.icons)) {
    throw new Error("Invalid IcoMoon JSON: missing icons array");
  }

  const icons = json.icons.map((ico) => {
    const paths = (ico.paths || [])
      .map((p) => `<path d="${p}" fill="currentColor"/>`)
      .join("");
    const svg = `<svg viewBox="0 0 ${ico.icon?.width || 1024} ${ico.icon?.height || 1024}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
    return {
      name: (ico.properties?.name || `icon-${ico.properties?.id}`).toLowerCase().replace(/[^a-z0-9-_]+/g, "-"),
      svgContent: sanitizeSvg(svg),
      tags: [ico.properties?.name?.split("-")[0] || "icomoon"],
      viewBox: `0 0 ${ico.icon?.width || 1024} ${ico.icon?.height || 1024}`,
    };
  });

  return { icons, errors: [], metadata: json };
}
