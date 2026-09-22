export function syncWidgetPlaceholder(component, config, options = {}) {
  const element = component?.view?.el;
  if (!element || !config || !config.widgetId) return;

  const widgetId = options.widgetId || config.widgetId;
  const configVersion = options.configVersion || config.configVersion || 1;
  const normalizedConfig = {
    ...config,
    widgetId,
    configVersion,
  };

  element.dataset.widget = widgetId;
  element.dataset.config = JSON.stringify(normalizedConfig);

  const storeId = options.storeId ?? normalizedConfig.storeId;
  if (storeId) element.dataset.storeId = storeId;
  else delete element.dataset.storeId;

  const cssId = options.cssId ?? normalizedConfig.cssId;
  if (cssId) element.setAttribute("id", cssId);
  else element.removeAttribute("id");

  const cssClass = options.cssClass ?? normalizedConfig.cssClass;
  if (cssClass) element.dataset.cssClass = cssClass;
  else delete element.dataset.cssClass;

  return normalizedConfig;
}

export default syncWidgetPlaceholder;
