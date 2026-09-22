export const deleteCommand = (editor) => ({
  run(editorInstance) {
    const selected = editorInstance.getSelected();
    if (!selected) return;
    selected.remove();
  },
});
