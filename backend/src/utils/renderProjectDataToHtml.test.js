const test = require("node:test");
const assert = require("node:assert/strict");
const grapesjs = require("grapesjs");
const { JSDOM } = require("jsdom");

const { renderProjectDataToHtml } = require("./renderProjectDataToHtml");

// renderProjectDataToHtml relies on browser globals (window/document/...) that
// GrapesJS expects. We mirror the exact global setup the function itself uses so
// fixture generation (getProjectData) and rendering share one contract.
function withJsdomGlobals(fn) {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`);
  const w = dom.window;
  const saved = {
    window: global.window,
    document: global.document,
    navigator: global.navigator,
    Element: global.Element,
    HTMLElement: global.HTMLElement,
    Node: global.Node,
    CustomEvent: global.CustomEvent,
  };
  global.window = w;
  global.document = w.document;
  global.navigator = w.navigator;
  global.Element = w.Element;
  global.HTMLElement = w.HTMLElement;
  global.Node = w.Node;
  global.CustomEvent = w.CustomEvent;
  try {
    return fn();
  } finally {
    Object.keys(saved).forEach((k) => {
      if (saved[k] === undefined) delete global[k];
      else global[k] = saved[k];
    });
  }
}

// Build a valid projectData by round-tripping it through GrapesJS exactly like
// the admin editor does (getProjectData), so renderProjectDataToHtml receives a
// format it is guaranteed to accept.
function buildProjectData(componentDefs) {
  return withJsdomGlobals(() => {
    const editor = grapesjs.init({
      container: global.document.createElement("div"),
      fromElement: false,
      storageManager: false,
      plugins: [],
    });
    try {
      const wrapper = editor.getWrapper();
      componentDefs.forEach((def) => wrapper.append(def));
      return editor.getProjectData();
    } finally {
      editor.destroy();
    }
  });
}

test("returns an empty string (never undefined/null) for nullish input", () => {
  assert.equal(renderProjectDataToHtml(null), "");
  assert.equal(renderProjectDataToHtml(undefined), "");
});

test("renders a representative page (heading + paragraph + image) to a non-empty string", () => {
  const projectData = buildProjectData([
    {
      tagName: "section",
      attributes: { class: "hero" },
      components: [
        { tagName: "h1", content: "Hero Title" },
        { tagName: "p", content: "Subtitle text" },
        { tagName: "img", attributes: { src: "/img.png", alt: "alt text" } },
      ],
    },
  ]);

  const html = renderProjectDataToHtml(projectData);

  assert.equal(typeof html, "string", "render must return a string, not undefined");
  assert.ok(html.length > 0, "render must not return an empty string for valid input");
  assert.ok(html.includes("Hero Title"), "rendered HTML must contain heading text");
  assert.ok(html.includes("Subtitle text"), "rendered HTML must contain paragraph text");
  assert.ok(html.includes("/img.png"), "rendered HTML must contain the image src");
});

test("applies stagger delays to scroll-animated children", () => {
  const projectData = buildProjectData([
    {
      tagName: "div",
      attributes: { "data-stagger-delay": "120" },
      components: [
        { tagName: "div", attributes: { "data-scroll-animation": "fade" }, content: "A" },
        { tagName: "div", attributes: { "data-scroll-animation": "fade" }, content: "B" },
        { tagName: "div", attributes: { "data-scroll-animation": "fade" }, content: "C" },
      ],
    },
  ]);

  const html = renderProjectDataToHtml(projectData);

  assert.equal(typeof html, "string", "render must return a string, not undefined");
  // Stagger: child 0 -> 0ms, child 1 -> 120ms, child 2 -> 240ms
  assert.ok(html.includes('data-scroll-delay="0"'), "first staggered child should get delay 0");
  assert.ok(html.includes('data-scroll-delay="120"'), "second staggered child should get delay 120");
  assert.ok(html.includes('data-scroll-delay="240"'), "third staggered child should get delay 240");
});

test("does not leak jsdom globals after rendering (guards the dom.body/document.body regression class)", () => {
  const documentBefore = global.document;
  const projectData = buildProjectData([{ tagName: "div", content: "cleanup check" }]);

  const html = renderProjectDataToHtml(projectData);

  assert.equal(typeof html, "string");
  // The function must clean up the globals it sets in its finally block, so a
  // later call (or the host process) is not left with a stale jsdom document.
  assert.equal(global.document, documentBefore, "render must restore global.document");
});

test("adds lazy loading and accessibility attributes to generated markup", () => {
  const projectData = buildProjectData([
    {
      tagName: "section",
      attributes: { class: "accordion-component" },
      components: [
        {
          tagName: "div",
          attributes: { class: "accordion-item open" },
          components: [
            { tagName: "button", attributes: { class: "accordion-header" }, content: "Question" },
            { tagName: "div", attributes: { class: "accordion-body" }, content: "Answer" },
          ],
        },
      ],
    },
    {
      tagName: "div",
      attributes: { class: "tabs-component" },
      components: [
        { tagName: "button", attributes: { class: "tab-btn" }, content: "One" },
        { tagName: "div", attributes: { class: "tab-panel" }, content: "Panel" },
      ],
    },
    {
      tagName: "div",
      components: [{ tagName: "img", attributes: { src: "/hero.png", alt: "Hero" } }],
    },
  ]);

  const html = renderProjectDataToHtml(projectData);

  assert.ok(html.includes('loading="lazy"'), "images should be lazy-loaded by default");
  assert.ok(html.includes('role="button"'), "accordion headers should expose a button role");
  assert.ok(html.includes('aria-expanded="true"'), "accordion headers should expose expanded state");
  assert.ok(html.includes('role="tablist"'), "tabs should expose a tablist role");
  assert.ok(html.includes('role="tabpanel"'), "tabs panels should expose a tabpanel role");
});

test("preserves structured data markup when rendering HTML", () => {
  const projectData = buildProjectData([
    {
      tagName: "section",
      attributes: { class: "faq-section" },
      components: [
        {
          tagName: "div",
          attributes: { class: "faq-item" },
          components: [
            { tagName: "h3", attributes: { class: "faq-question" }, content: "What is included?" },
            { tagName: "div", attributes: { class: "faq-answer" }, content: "A full setup and onboarding session." },
          ],
        },
      ],
    },
  ]);

  const html = renderProjectDataToHtml(projectData, {
    product: { name: "Demo product", image: "/demo.png", currency: "USD", price: "19.99" },
  });

  assert.ok(html.includes('application/ld+json'), "structured data script should be included in the rendered HTML");
  assert.ok(html.includes('FAQPage'), "FAQPage schema should be preserved in rendered HTML");
});
