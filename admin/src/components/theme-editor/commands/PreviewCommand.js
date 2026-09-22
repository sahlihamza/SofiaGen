export const previewCommand = (editor) => ({
  run(editorInstance) {
    const html = editorInstance.getHtml();
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
  },
});
