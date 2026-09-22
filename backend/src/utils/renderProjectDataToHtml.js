const grapesjs = require("grapesjs");
const { JSDOM } = require("jsdom");

function applyStaggerDelays(html) {
  if (!html) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const containers = document.querySelectorAll("[data-stagger-delay]");
  containers.forEach((container) => {
    const baseDelay = parseInt(container.getAttribute("data-stagger-delay"), 10) || 0;
    if (!baseDelay) return;
    Array.from(container.children).forEach((child, index) => {
      if (child.hasAttribute("data-scroll-animation") && !child.hasAttribute("data-scroll-delay")) {
        child.setAttribute("data-scroll-delay", String(baseDelay * index));
      }
    });
  });
  return document.body.innerHTML;
}

function enhanceAccessibilityAndLazyLoading(html) {
  if (!html) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;

  document.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("loading")) {
      img.setAttribute("loading", "lazy");
    }
    if (!img.hasAttribute("decoding")) {
      img.setAttribute("decoding", "async");
    }
  });

  document.querySelectorAll(".accordion-component .accordion-header").forEach((header, index) => {
    if (!header.hasAttribute("role")) header.setAttribute("role", "button");
    if (!header.hasAttribute("aria-expanded")) {
      const item = header.closest(".accordion-item");
      header.setAttribute("aria-expanded", item?.classList.contains("open") ? "true" : "false");
    }
    if (!header.hasAttribute("aria-controls")) {
      const body = header.parentElement?.querySelector(".accordion-body");
      if (body) {
        const bodyId = body.id || `accordion-body-${index + 1}`;
        body.id = bodyId;
        header.setAttribute("aria-controls", bodyId);
      }
    }
    if (!header.hasAttribute("tabindex")) header.setAttribute("tabindex", "0");
  });

  document.querySelectorAll(".tabs-component").forEach((root, index) => {
    if (!root.hasAttribute("role")) root.setAttribute("role", "tablist");
    const rootId = root.id || `tabs-${index + 1}`;
    root.id = rootId;
    root.querySelectorAll(".tab-btn").forEach((btn, btnIndex) => {
      if (!btn.hasAttribute("role")) btn.setAttribute("role", "tab");
      if (!btn.hasAttribute("tabindex")) btn.setAttribute("tabindex", "0");
      const panelSelector = `.tab-panel[data-tab-panel="${btn.getAttribute("data-tab-target") || btnIndex + 1}"]`;
      const panel = root.querySelector(panelSelector) || root.querySelectorAll(".tab-panel")[btnIndex];
      if (panel) {
        const panelId = panel.id || `${rootId}-panel-${btnIndex + 1}`;
        panel.id = panelId;
        if (!btn.hasAttribute("aria-controls")) btn.setAttribute("aria-controls", panelId);
        if (!panel.hasAttribute("role")) panel.setAttribute("role", "tabpanel");
      }
    });
  });

  return document.body.innerHTML;
}

function injectStructuredData(html, context = {}) {
  if (!html) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const scripts = [];
  const product = context.product || null;
  const faqItems = [];
  document.querySelectorAll(".faq-item, .accordion-item").forEach((item) => {
    const question = item.querySelector(".faq-question, .accordion-header")?.textContent?.trim();
    const answer = item.querySelector(".faq-answer, .accordion-body")?.textContent?.trim();
    if (question && answer) faqItems.push({ question, answer });
  });

  if (product) {
    scripts.push(`{"@context":"https://schema.org","@type":"Product","name":"${(product.name || "Product").replace(/"/g, '\\"')}","image":"${(product.image || "").replace(/"/g, '\\"')}","offers":{"@type":"Offer","priceCurrency":"${(product.currency || "USD").replace(/"/g, '\\"')}","price":"${product.price || ""}","availability":"${(product.availability || "https://schema.org/InStock").replace(/"/g, '\\"')}"}}`);
  }

  if (faqItems.length) {
    const faqJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
    scripts.push(faqJson);
  }

  if (scripts.length) {
    const scriptTag = document.createElement("script");
    scriptTag.setAttribute("type", "application/ld+json");
    scriptTag.textContent = scripts.map((entry) => entry).join("\n");
    document.body.appendChild(scriptTag);
  }

  return document.body.innerHTML;
}

function generateHoverCss(component, { prefix, selector, componentUniqueClass, hoverTraits = [] }) {
  const rules = [];
  hoverTraits.forEach(({ traitSuffix, cssProperty }) => {
    const traitName = `${prefix}${traitSuffix}Hover`;
    const value = component.get(traitName);
    if (value) rules.push(`${cssProperty}: ${value};`);
  });
  if (!rules.length) return "";
  return `.${componentUniqueClass} ${selector}:hover { ${rules.join(" ")} }`;
}

function walkComponents(component, callback) {
  callback(component);
  const children = component.components ? component.components() : null;
  if (children && children.length) {
    children.forEach((child) => walkComponents(child, callback));
  }
}

function applyHoverStyles(html, editor) {
  if (!html || !editor) return html;
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const hoverCssRules = [];
  const wrapper = editor.getWrapper ? editor.getWrapper() : editor.DomComponents.getWrapper();

  walkComponents(wrapper, (component) => {
    const traits = component.getTraits?.() || [];
    const hoverTraitNames = traits.filter((t) => t.get("name")?.endsWith("Hover")).map((t) => t.get("name"));
    if (!hoverTraitNames.length) return;

    const uniqueClass = `acc-${component.getId()}`;
    const rules = [];
    hoverTraitNames.forEach((traitName) => {
      const value = component.get(traitName);
      if (!value) return;
      const baseName = traitName.replace(/Hover$/, "");
      const cssProp = baseName.toLowerCase().includes("background") ? "background-color"
        : baseName.toLowerCase().includes("text") ? "color"
        : null;
      if (cssProp) rules.push(`${cssProp}: ${value};`);
    });
    if (!rules.length) return;

    const selector = component.get("type") === "accordion-component" ? ".accordion-header" : "";
    if (!selector) return;
    hoverCssRules.push(`.${uniqueClass} ${selector}:hover { ${rules.join(" ")} }`);
  });

  if (hoverCssRules.length) {
    const style = document.createElement("style");
    style.textContent = hoverCssRules.join("\n");
    document.head.appendChild(style);
  }

  return document.body.innerHTML;
}

function renderProjectDataToHtml(projectData, context = {}) {
  if (!projectData) return "";

  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`);
  const window = dom.window;
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.Element = window.Element;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  global.CustomEvent = window.CustomEvent;

  const editor = grapesjs.init({
    container: dom.window.document.createElement("div"),
    fromElement: false,
    storageManager: false,
    plugins: [],
    styleManager: { clearProperties: 1 },
  });

  try {
    editor.loadProjectData(projectData);
    const html = editor.getHtml();
    const withStagger = applyStaggerDelays(html);
    const withAccessibility = enhanceAccessibilityAndLazyLoading(withStagger);
    const withStructuredData = injectStructuredData(withAccessibility, context);
    return applyHoverStyles(withStructuredData, editor);
  } finally {
    editor.destroy();
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.Element;
    delete global.HTMLElement;
    delete global.Node;
    delete global.CustomEvent;
  }
}

function renderProjectDataToCss(projectData) {
  if (!projectData) return "";

  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`);
  const window = dom.window;
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.Element = window.Element;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  global.CustomEvent = window.CustomEvent;

  const editor = grapesjs.init({
    container: dom.window.document.createElement("div"),
    fromElement: false,
    storageManager: false,
    plugins: [],
    styleManager: { clearProperties: 1 },
  });

  try {
    editor.loadProjectData(projectData);
    const css = editor.getCss();
    return css;
  } finally {
    editor.destroy();
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.Element;
    delete global.HTMLElement;
    delete global.Node;
    delete global.CustomEvent;
  }
}

module.exports = {
  renderProjectDataToHtml,
  renderProjectDataToCss,
};
