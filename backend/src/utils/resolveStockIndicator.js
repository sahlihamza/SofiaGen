const dynamicDataSources = require("../config/dynamicDataSources");

async function resolveStockIndicator(html, storeId, contextParams = {}) {
  if (!html) return html;
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const document = dom.window.document;

  const nodes = Array.from(document.querySelectorAll("[data-stock-indicator]"));
  for (const node of nodes) {
    const sourceKey = node.getAttribute("data-dynamic-source") || "product.stock";
    const source = dynamicDataSources[sourceKey];
    if (!source) continue;

    const paramsAttr = node.getAttribute("data-dynamic-params");
    let params = {};
    try {
      params = paramsAttr ? JSON.parse(paramsAttr) : {};
    } catch (e) {
      params = {};
    }

    const data = await source.resolve(storeId, { ...contextParams, ...params });
    if (!data) {
      const textEl = node.querySelector(".stock-indicator-text");
      if (textEl) textEl.textContent = node.getAttribute("data-stock-neutral") || "";
      continue;
    }

    const threshold = parseInt(node.getAttribute("data-stock-threshold") || "10", 10);
    const lowStockMsg = node.getAttribute("data-stock-low-message") || "Plus que {count} en stock !";
    const inStockMsg = node.getAttribute("data-stock-in-message") || "En stock";
    const outOfStockMsg = node.getAttribute("data-stock-out-message") || "Rupture de stock";
    const lowStockColor = node.getAttribute("data-stock-low-color") || "#dc2626";
    const inStockColor = node.getAttribute("data-stock-in-color") || "#16a34a";
    const outOfStockColor = node.getAttribute("data-stock-out-color") || "#6b7280";

    let message = inStockMsg;
    let color = inStockColor;

    if (data.stockStatus === "outofstock") {
      message = outOfStockMsg;
      color = outOfStockColor;
    } else if (data.stockQuantity <= threshold) {
      message = lowStockMsg.replace("{count}", String(data.stockQuantity));
      color = lowStockColor;
    }

    const textEl = node.querySelector(".stock-indicator-text");
    if (textEl) textEl.textContent = message;

    const dotEl = node.querySelector(".stock-indicator-dot");
    if (dotEl) dotEl.style.backgroundColor = color;
    if (textEl) textEl.style.color = color;
  }

  return document.body.innerHTML;
}

module.exports = { resolveStockIndicator };
