import React, { useEffect, useState } from "react";
import { useEditor } from "./hooks/editor/EditorProvider";

const getPlaceholderComponents = (editor) => {
  if (!editor) return [];
  try {
    const wrapper = editor.getWrapper();
    if (!wrapper) return [];
    const all = wrapper.find("[data-placeholder-content]");
    return Array.isArray(all) ? all : [all];
  } catch (e) {
    return [];
  }
};

const PlaceholderContentBanner = () => {
  const { editor } = useEditor();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!editor) {
      setCount(0);
      return;
    }

    const updateCount = () => {
      const items = getPlaceholderComponents(editor);
      setCount(items.filter(Boolean).length);
    };

    updateCount();
    editor.on("component:add component:update component:remove", updateCount);

    return () => {
      editor.off("component:add component:update component:remove", updateCount);
    };
  }, [editor]);

  if (!editor || count === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        background: "#FEF3C7",
        borderBottom: "1px solid #FBBF24",
        color: "#92400E",
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 16 }}>=</span>
      <span>
        {count} section{count > 1 ? "s" : ""} utilise{count > 1 ? "nt" : ""} du contenu de démonstration.
      </span>
    </div>
  );
};

export default PlaceholderContentBanner;
