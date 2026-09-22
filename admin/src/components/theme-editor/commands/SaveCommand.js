export const saveCommand = (editor) => ({
  run(editorInstance) {
    const html = editorInstance.getHtml();
    const css = editorInstance.getCss();
    const project = editorInstance.getProjectData();
    console.log("Save command:", { html, css, project });
    // TODO: dispatch save to backend via ThemeEditorServices
  },
});
