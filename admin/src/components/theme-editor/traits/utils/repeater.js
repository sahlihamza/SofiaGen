// Utility to sync an items[] trait with GrapesJS subcomponents inside a wrapper selector
export function bindItemListSync(component, traitName, wrapperSelector, itemToComponentDef) {
  if (!component || !component.get || !component.set) return;

  const getWrapper = () => component.find(wrapperSelector)?.[0];

  const syncToTrait = () => {
    const wrapper = getWrapper();
    if (!wrapper) return;
    const items = wrapper.components().map((c) => c.getAttributes?.().__itemData || null).filter(Boolean);
    component.set(traitName, items);
  };

  const wrapperChangeHandler = () => {
    const wrapper = getWrapper();
    if (!wrapper) return;

    wrapper.components().each((c) => {
      const attrs = c.getAttributes() || {};
      const existingItem = attrs.__itemData || {};
      const children = c.components && c.components();
      const body = Array.isArray(children)
        ? children.find((child) => {
            const childAttrs = child.getAttributes?.() || {};
            const classes = child.getClasses?.() || [];
            return (
              (typeof childAttrs['data-gjs-type'] === 'string' && childAttrs['data-gjs-type'].includes('body')) ||
              classes.includes('accordion-body') ||
              classes.includes('faq-answer') ||
              childAttrs.class === 'accordion-body' ||
              childAttrs.class === 'faq-answer'
            );
          })
        : undefined;

      let contentValue = "";
      if (body) {
        const bodyComps = body.components && body.components();
        if (Array.isArray(bodyComps) && bodyComps.length) {
          contentValue = bodyComps.map((child) => (typeof child.toJSON === 'function' ? child.toJSON() : child));
        } else {
          contentValue = body.get('content') || "";
        }
      } else {
        contentValue = c.get('content') || "";
      }

      attrs.__itemData = {
        ...existingItem,
        content: contentValue,
      };
      c.setAttributes(attrs);
    });

    syncToTrait();
  };

  const attachWrapperListener = () => {
    const wrapper = getWrapper();
    if (!wrapper || wrapper.__itemListSyncAttached) return;
    wrapper.__itemListSyncAttached = true;
    wrapper.on('change:components add remove', wrapperChangeHandler);
  };

  const syncFromTrait = () => {
    let items = component.get(traitName) || [];
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }

    const wrapper = getWrapper();
    if (!wrapper) return;

    wrapper.components().reset();
    items.forEach((item, idx) => {
      const def = itemToComponentDef(item, idx) || { type: 'text', content: '' };
      def.attributes = {
        ...def.attributes,
        __itemData: item,
      };
      wrapper.append(def);
    });

    attachWrapperListener();
  };

  // Initial sync
  syncFromTrait();
  attachWrapperListener();

  // Watch for trait changes -> update DOM
  component.on(`change:${traitName}`, syncFromTrait);

  // return unbind function
  return () => {
    component.off(`change:${traitName}`, syncFromTrait);
    const wrapper = getWrapper();
    if (wrapper) wrapper.off('change:components add remove', wrapperChangeHandler);
  };
}
