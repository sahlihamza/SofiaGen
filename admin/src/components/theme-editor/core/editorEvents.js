export const initEditorEvents = (editor, {
  setPages,
  setCurrentPageId,
  setCurrentDevice,
  onStateChange
}) => {
  // --- Page events ---
  editor.on("page", () => {
    setPages([...editor.Pages.getAll()]);
    setCurrentPageId(editor.Pages.getSelected().id);
  });

  // --- Device events ---
  editor.on("device:select", (device) => {
    setCurrentDevice(device.id);
  });

  // --- Content change events ---
  if (onStateChange) {
    editor.on("change:changesCount", () => {
      onStateChange({
        html: editor.getHtml(),
        css: editor.getCss(),
        projectData: editor.getProjectData()
      });
    });
  }

  // --- Future events to listen to ---
  // editor.on("component:add", (component) => { ... });
  // editor.on("component:update", (component) => { ... });
  // editor.on("asset:add", (asset) => { ... });
};
