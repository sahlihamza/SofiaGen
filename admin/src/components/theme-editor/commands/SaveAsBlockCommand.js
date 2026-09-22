import savedBlockService from "@/services/savedBlockService";

/**
 * SaveAsBlockCommand  même pattern exact que DuplicateCommand.js /
 * DeleteCommand.js déjà présents dans commands/.
 *
 * `getStoreId` est une fonction injecté (pas une valeur figé), car ce
 * fichier est instancié une seule fois au moment de registerCommands(editor)
 *  bien avant que effectiveStoreId ne soit connu côté React. En passant
 * une fonction plutôt qu'une valeur, la commande lit toujours le storeId
 * ACTUEL au moment du clic, jamais une valeur périmé figé  l'init.
 */
export const saveAsBlockCommand = (editor, getStoreId) => ({
  async run(editorInstance) {
    const selected = editorInstance.getSelected();
    if (!selected) return;

    const storeId = getStoreId?.();
    if (!storeId) {
      console.warn("saveAsBlockCommand: storeId introuvable, sauvegarde annulée");
      return;
    }

    const name = selected.get("name") || "Mon bloc";
    const isSynced = false;

    const componentJson = selected.toJSON();

    try {
      await savedBlockService.createSavedBlock(storeId, {
        name,
        category: "P Mes Blocs",
        componentJson,
        isSynced,
      });

      editorInstance.trigger("saved-blocks:refresh");
    } catch (err) {
      console.error("échec de la sauvegarde du bloc:", err);
    }
  },
});
