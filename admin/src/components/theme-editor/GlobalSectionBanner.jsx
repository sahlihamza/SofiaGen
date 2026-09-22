import React from "react";
import { useEditor } from "./hooks/editor/EditorProvider";
import { Button } from "@sofia/ui";

const LABELS = {
  header: "le Header",
  footer: "le Footer",
  announcement_bar: "la barre d'annonce",
  cookie_banner: "le bandeau cookies",
};

const GlobalSectionBanner = () => {
  const { isEditingGlobalSection, currentPageId, GLOBAL_SECTION_IDS, selectPage, pages } = useEditor();

  if (!isEditingGlobalSection) return null;

  const type = Object.entries(GLOBAL_SECTION_IDS || {}).find(([, id]) => id === currentPageId)?.[0];
  const homePage = pages.find((p) => p.isHome);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: "#DBEAFE",
        borderBottom: "1px solid #93C5FD",
        fontSize: 13,
        color: "#1E3A5F",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 16 }}>ðŸ”—</span>
      <span>
        Vous modifiez <strong>{LABELS[type] || "une section globale"}</strong> â€”
        ce changement s'appliquera Ã  <strong>toutes les pages</strong> de la boutique dÃ¨s la publication.
      </span>
      <Button
        onClick={() => homePage && selectPage(homePage._id)}
        style={{
          marginLeft: "auto",
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid #93C5FD",
          background: "transparent",
          color: "#1E3A5F",
          cursor: "pointer",
        }}
      >
        â† Retour Ã  la page
      </Button>
    </div>
  );
};

export default GlobalSectionBanner;
