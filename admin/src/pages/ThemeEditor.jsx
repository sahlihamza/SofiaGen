import React, { useEffect, useState } from "react";

import { FiEdit, FiX } from "react-icons/fi";
import Cookies from "js-cookie";
import GjsEditorShell from "@/components/theme-editor/GjsEditorShell";
import { EditorProvider, useEditor } from "@/components/theme-editor/hooks/editor/EditorProvider";
import ThemeSettingsPanel from "@/components/theme-editor/panels/ThemeSettings";
import userService from "@/services/userService";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import { Button } from "@sofia/ui";

// THEME-03: mirrors the same Level 1/Level 2 gate as Themes.jsx â€” see
// HiddenCanvasHost there for why the ref still needs to attach to
// something even when the visible canvas never renders.
const HiddenCanvasHost = () => {
  const { editorRef } = useEditor();
  return <div ref={editorRef} style={{ display: "none" }} aria-hidden="true" />;
};

const ThemeEditor = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorState, setEditorState] = useState(null);
  const [storeId, setStoreId] = useState(Cookies.get("company") || null);
  const [hasBuilderAccess, setHasBuilderAccess] = useState(null); // null = unknown yet

  useEffect(() => {
    const resolveStoreId = async () => {
      const companyCookie = Cookies.get("company");
      if (companyCookie) {
        setStoreId(companyCookie);
        return;
      }

      try {
        const me = await userService.getMe();
        const fallbackStoreId =
          me?.company || me?.storeId || me?.store || null;

        if (fallbackStoreId) {
          const cookieTimeOut = 0.5;
          const cookieOptions = {
            expires: cookieTimeOut,
            sameSite: window.location.protocol === "https:" ? "None" : "Lax",
            secure: window.location.protocol === "https:",
          };
          Cookies.set("company", fallbackStoreId, cookieOptions);
          setStoreId(fallbackStoreId);
        }
      } catch (err) {
        console.error("Unable to resolve storeId for ThemeEditor:", err);
      }
    };

    if (!storeId) {
      resolveStoreId();
    }
  }, [storeId]);

  // THEME-03: this page is a second, independent entry point to the
  // builder (distinct from Themes.jsx's "Customize" button) that used to
  // mount GjsEditorShell unconditionally â€” a Level 1 store owner who
  // guessed or bookmarked this URL reached the full canvas regardless of
  // Plan. Every canvas write is still independently re-checked server-side
  // (see themeRoutes.js / pageController.js), but this closes the "the
  // canvas is visible at all" gap the ticket asks to verify.
  useEffect(() => {
    if (!storeId) return;
    ThemeEditorServices.getBuilderAccess(storeId).then(setHasBuilderAccess);
  }, [storeId]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Theme Editor</h1>
        <p className="text-sm text-gray-500 mt-2">Open the visual editor to customize your theme.</p>
      </div>

      <Button onClick={() => setIsEditorOpen(true)} className="flex items-center gap-2" disabled={hasBuilderAccess === null}>
        <FiEdit /> Open Visual Editor
      </Button>

      {isEditorOpen && hasBuilderAccess && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Close Button Header */}
          <div className="h-12 bg-gray-900 flex items-center justify-between px-4 text-white flex-shrink-0">
            <span className="font-semibold">Visual Theme Editor</span>
            <Button
              onClick={() => setIsEditorOpen(false)}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
            >
              <FiX size={20} />
            </Button>
          </div>

          {/* Editor Container */}
          <div className="flex-1 overflow-hidden relative">
            <GjsEditorShell storeId={storeId} onStateChange={setEditorState} />
          </div>
        </div>
      )}

      {isEditorOpen && hasBuilderAccess === false && (
        <EditorProvider storeId={storeId}>
          <HiddenCanvasHost />
          <ThemeSettingsPanel onClose={() => setIsEditorOpen(false)} />
        </EditorProvider>
      )}
    </div>
  );
};

export default ThemeEditor;
