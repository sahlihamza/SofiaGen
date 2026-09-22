import { saveCommand } from "../commands/SaveCommand";
import { previewCommand } from "../commands/PreviewCommand";
import { duplicateCommand } from "../commands/DuplicateCommand";
import { deleteCommand } from "../commands/DeleteCommand";
import { saveAsBlockCommand } from "../commands/SaveAsBlockCommand";
import { makeGlobalCommand } from "../commands/MakeGlobalCommand";

/**
 * getStoreId est injecté depuis EditorProvider (voir patch dédié) car
 * editorCommands.js n'a lui-même aucune connaissance de React ou du
 * contexte store  il ne fait qu'enregistrer des commandes GrapesJS.
 */
export const registerEditorCommands = (editor, getStoreId) => {
  editor.Commands.add("save-template", saveCommand(editor));
  editor.Commands.add("preview-template", previewCommand(editor));
  editor.Commands.add("duplicate-component", duplicateCommand(editor));
  editor.Commands.add("delete-component", deleteCommand(editor));
  editor.Commands.add("save-as-block", saveAsBlockCommand(editor, getStoreId));
  editor.Commands.add("make-global", makeGlobalCommand(editor, getStoreId));
};
