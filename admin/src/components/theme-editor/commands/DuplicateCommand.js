export const duplicateCommand = (editor) => ({
  run(editorInstance) {
    const selected = editorInstance.getSelected();
    if (!selected) return;
    const clone = selected.clone();
    editorInstance.addComponent(clone);    
  },
});
