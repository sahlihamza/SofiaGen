import savedBlockService from "@/services/savedBlockService";

const SAVED_BLOCK_PREFIX = "saved-block-";

function clearPreviousSavedBlocks(editor) {
  const bm = editor.BlockManager;
  const all = bm.getAll();

  all.forEach((block) => {
    if (block.get("id")?.startsWith(SAVED_BLOCK_PREFIX)) {
      bm.remove(block.get("id"));
    }
  });
}

export async function loadSavedBlocks(editor, storeId) {
  if (!editor || !storeId) return;

  try {
    const blocks = await savedBlockService.listSavedBlocks(storeId);
    const bm = editor.BlockManager;

    clearPreviousSavedBlocks(editor);

    blocks.forEach((block) => {
      let content = block.componentJson;
      
      // If it's a synced block, add a special identifier
      if (block.isSynced) {
        if (typeof content === 'object' && !Array.isArray(content)) {
          content = {
            ...content,
            attributes: { ...(content.attributes || {}), "data-synced-block-id": block._id }
          };
        } else if (typeof content === 'string' && content.startsWith('<')) {
          content = `<div data-synced-block-id="${block._id}">${content}</div>`;
        }
      }

      const isGlobal = !!block.isGlobalComponent;
      const labelPrefix = isGlobal ? '<' : 'P';
      const syncSuffix = block.isSynced && !isGlobal ? ' (Synchro)' : '';
      const categoryName = isGlobal ? '< Composants Globaux' : (block.category || 'P Mes Blocs');

      bm.add(`${SAVED_BLOCK_PREFIX}${block._id}`, {
        label: `${labelPrefix} ${block.name}${syncSuffix}`,
        category: categoryName,
        content,
        attributes: { class: isGlobal ? 'fa fa-globe' : (block.isSynced ? 'fa fa-refresh' : 'fa fa-star') },
      });
    });
  } catch (err) {
    console.error("loadSavedBlocks error:", err);
  }
}

export function injectComponentToolbar(editor) {
  editor.on("component:selected", (component) => {
    const toolbarNow = component.get("toolbar") || [];

    const existsMatch = (candidate) => {
      return toolbarNow.some((item) => {
        try {
          const cmdEq = item.command && candidate.command && (item.command === candidate.command || item.command === candidate.command?.run || item.command?.run === candidate.command);
          const classEq = item.attributes && candidate.attributes && item.attributes.class === candidate.attributes.class;
          const titleEq = item.attributes && candidate.attributes && item.attributes.title === candidate.attributes.title;
          return Boolean(cmdEq || classEq || titleEq);
        } catch (e) {
          return false;
        }
      });
    };

    const candidates = [
      { attributes: { class: "fa fa-arrows", title: "Déplacer" }, command: "tlb-move" },
      { attributes: { class: "fa fa-copy", title: "Dupliquer" }, command: "duplicate-component" },
      { attributes: { class: "fa fa-star", title: "Enregistrer comme bloc réutilisable" }, command: "save-as-block" },
      { attributes: { class: "fa fa-trash", title: "Supprimer" }, command: "delete-component" },
    ];

    const toAdd = candidates.filter((c) => !existsMatch(c));
    if (toAdd.length) component.set("toolbar", [...toolbarNow, ...toAdd]);

    // For specific widget types, add a quick "Rendre global" button (avoid duplicates by class/title)
    const type = component.get('type') || component.get('name') || '';
    const GLOBAL_CANDIDATES = ['newsletter', 'cta', 'product-card', 'product_card', 'hero-product', 'productCard'];
    if (GLOBAL_CANDIDATES.includes((type || '').toLowerCase())) {
      const makeGlobal = { attributes: { class: 'fa fa-globe', title: 'Rendre global (Composant)' }, command: 'make-global' };
      if (!existsMatch(makeGlobal)) {
        component.set('toolbar', [...(component.get('toolbar') || []), makeGlobal]);
      }
    }

    // If this instance is already a synced/global block, add an "Edit global" button that opens the global editor
    const attrs = (typeof component.getAttributes === 'function') ? component.getAttributes() : (component.attributes || {});
    const syncedId = attrs && (attrs['data-synced-block-id'] || attrs['data-synced-block-id'] === 0 ? attrs['data-synced-block-id'] : null);
    if (syncedId) {
      const editGlobal = { attributes: { class: 'fa fa-pencil', title: 'Modifier ce composant global' }, command: {
        run: (ed) => {
          try { ed.trigger('saved-blocks:open-editor', { blockId: syncedId }); } catch (e) { console.debug(e); }
        }
      } };
      if (!existsMatch(editGlobal)) {
        const now = component.get('toolbar') || [];
        component.set('toolbar', [...now, editGlobal]);
      }
    }
  });
}
