const { JSDOM } = require("jsdom");
const dynamicDataSources = require("../config/dynamicDataSources");

function getNestedValue(obj, path) {
  if (!path || typeof obj !== "object" || obj === null) return undefined;
  return path.split(".").reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

async function applyBinding(node, bindField, data, document) {
  if (data === null || data === undefined) return;

  // For object data sources, try nested field access first
  if (typeof data === "object" && !Array.isArray(data)) {
    const nestedVal = getNestedValue(data, bindField);
    if (nestedVal !== undefined) {
      if (typeof nestedVal === "string" || typeof nestedVal === "number") {
        node.textContent = String(nestedVal);
        return;
      }
      if (typeof nestedVal === "object" && nestedVal != null && nestedVal.url) {
        node.setAttribute("src", nestedVal.url);
        return;
      }
    }
  }

  // Scalar binding
  if (typeof data === "string" || typeof data === "number" || (typeof data === "object" && !Array.isArray(data))) {
    const val = typeof data === "object" ? JSON.stringify(data) : String(data);
    if (!bindField || bindField === "text") {
      node.textContent = val;
    } else {
      node.setAttribute(bindField, val);
    }
    return;
  }

  // Arrays/collections are handled elsewhere (renderCollectionBinding)
}

async function resolveDynamicBindings(html, storeId, contextParams = {}) {
  if (!html) return html;
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${html}</body></html>`);
  const document = dom.window.document;

  const boundNodes = Array.from(document.querySelectorAll("[data-dynamic-source]"));
  for (const node of boundNodes) {
    const sourceKey = node.getAttribute("data-dynamic-source");
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

    const bindField = node.getAttribute("data-dynamic-field") || "text";
    try {
      await applyBinding(node, bindField, data, document);
    } catch (e) {
      // swallow individual binding errors
      console.error("resolveDynamicBindings applyBinding error:", e.message);
    }
  }

  return document.body.innerHTML;
}

module.exports = { resolveDynamicBindings };
