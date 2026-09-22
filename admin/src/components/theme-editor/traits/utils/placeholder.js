export function attachPlaceholderContentListener(component, eventNames = []) {
  if (!component || !component.on || !component.getAttributes || !component.setAttributes) return () => {};

  const removePlaceholderFlag = () => {
    const attrs = component.getAttributes() || {};
    if (attrs["data-placeholder-content"]) {
      const next = { ...attrs };
      delete next["data-placeholder-content"];
      component.setAttributes(next);
    }
  };

  eventNames.forEach((eventName) => {
    component.on(eventName, removePlaceholderFlag);
  });

  return () => {
    eventNames.forEach((eventName) => {
      component.off(eventName, removePlaceholderFlag);
    });
  };
}
