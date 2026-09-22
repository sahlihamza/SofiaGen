import { describe, expect, it } from "vitest";
import { syncWidgetPlaceholder } from "./widgetPlaceholder";

const createElement = () => ({
  dataset: {},
  attributes: {},
  setAttribute(name, value) {
    this.attributes[name] = value;
  },
  removeAttribute(name) {
    delete this.attributes[name];
  },
});

describe("syncWidgetPlaceholder", () => {
  it("serializes widget metadata and store context", () => {
    const element = createElement();
    const component = { view: { el: element } };

    const result = syncWidgetPlaceholder(component, {
      widgetId: "product-slider",
      configVersion: 1,
      storeId: "store-123",
      cssId: "featured-products",
      cssClass: "is-featured",
      limit: 12,
    });

    expect(result).toMatchObject({ widgetId: "product-slider", configVersion: 1 });
    expect(element.dataset.widget).toBe("product-slider");
    expect(JSON.parse(element.dataset.config)).toMatchObject({
      widgetId: "product-slider",
      configVersion: 1,
      limit: 12,
    });
    expect(element.dataset.storeId).toBe("store-123");
    expect(element.dataset.cssClass).toBe("is-featured");
    expect(element.attributes.id).toBe("featured-products");
  });

  it("removes stale optional attributes", () => {
    const element = createElement();
    element.dataset.storeId = "old-store";
    element.dataset.cssClass = "old-class";
    element.attributes.id = "old-id";
    const component = { view: { el: element } };

    syncWidgetPlaceholder(component, {
      widgetId: "form",
      configVersion: 1,
      storeId: "",
      cssId: "",
      cssClass: "",
    });

    expect(element.dataset.storeId).toBeUndefined();
    expect(element.dataset.cssClass).toBeUndefined();
    expect(element.attributes.id).toBeUndefined();
  });
});
