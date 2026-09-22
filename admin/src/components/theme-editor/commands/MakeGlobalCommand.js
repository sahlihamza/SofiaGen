import savedBlockService from "@/services/savedBlockService";

export const makeGlobalCommand = (editor, getStoreId) => ({
  async run(editorInstance) {
    const selected = editorInstance.getSelected();
    if (!selected) return;

    const storeId = getStoreId?.();
    if (!storeId) {
      console.warn("makeGlobalCommand: storeId introuvable, action annulée");
      return;
    }

    const name = selected.get('name') || 'Composant global';

    const componentJson = selected.toJSON();

    try {
      // Force isSynced and mark as global component
      const savedBlock = await savedBlockService.createSavedBlock(storeId, {
        name,
        category: '< Composants Globaux',
        componentJson,
        isSynced: true,
        isGlobalComponent: true,
      });

      // Transform the original instance into a synced instance pointing to the created SavedBlock
      try {
        const blockId = savedBlock && savedBlock._id ? savedBlock._id : (savedBlock && savedBlock.id) ? savedBlock.id : null;
        if (blockId) {
          // Add attribute so backend extraction / applySyncedBlocksToHtml will pick it up
          if (typeof selected.addAttributes === 'function') {
            selected.addAttributes({ 'data-synced-block-id': blockId });
          } else if (typeof selected.setAttributes === 'function') {
            const attrs = selected.getAttributes ? selected.getAttributes() || {} : {};
            attrs['data-synced-block-id'] = blockId;
            selected.setAttributes(attrs);
          }

          // Improve visibility in Layers/Inspector
          try { selected.set('custom-name', `< ${name}`); } catch (e) { /* ignore */ }

          // Trigger editor event to schedule immediate save / update usage
          try { editorInstance.trigger('component:update', selected); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.debug('Failed to convert instance to synced block', e);
      }

      editorInstance.trigger('saved-blocks:refresh');
    } catch (err) {
      console.error('Erreur lors de la création du composant global:', err);
    }
  },
});

export default makeGlobalCommand;
