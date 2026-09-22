import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiEdit3, FiCopy, FiTrash2, FiSave, FiScissors, FiClipboard, FiAlertTriangle } from "react-icons/fi";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useEditor } from "./hooks/editor/EditorProvider";
import savedBlockService from "@/services/savedBlockService";
import { Button } from "@sofia/ui";

const STORAGE_KEY = "sofiagen-copied-style";

const getComponentType = (component) => {
  if (!component) return "";
  return component.get("type") || "";
};

const isTextComponent = (component) => {
  if (!component) return false;
  if (typeof component.isText === "function" && component.isText()) return true;
  return getComponentType(component).toLowerCase() === "text";
};

const clampPosition = (position, menuRect) => {
  const padding = 12;
  const x = Math.min(position.x, window.innerWidth - menuRect.width - padding);
  const y = Math.min(position.y, window.innerHeight - menuRect.height - padding);
  return {
    x: Math.max(padding, x),
    y: Math.max(padding, y),
  };
};

const ContextMenu = ({ isVisible, position, target, onClose }) => {
  const { editor, effectiveStoreId, storeId } = useEditor();
  const menuRef = useRef(null);
  const [copiedStyle, setCopiedStyle] = useState(null);
  const [menuPosition, setMenuPosition] = useState(position);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const storeScopeId = effectiveStoreId || storeId;
  const isText = isTextComponent(target);
  const isRoot = !target || (typeof target.isRoot === "function" && target.isRoot());
  const canSaveAsTemplate = Boolean(target && !isText && !isRoot);
  const canDuplicate = Boolean(target && !isRoot);
  const canDelete = Boolean(target && !isRoot);
  const canPasteStyle = Boolean(copiedStyle);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCopiedStyle(JSON.parse(stored));
      } catch (error) {
        console.warn("Invalid copied style stored", error);
      }
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const frameDoc = editor?.Canvas?.getFrameEl?.()?.contentDocument || editor?.Canvas?.getFrameEl?.()?.contentWindow?.document || null;

    const handleClickOutside = (e) => {
      if (deleteModalOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (deleteModalOpen) {
          setDeleteModalOpen(false);
        } else {
          onClose();
        }
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!target) return;

      if (isMod && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyStyle();
      }
      if (isMod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        handlePasteStyle();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    if (frameDoc) {
      frameDoc.addEventListener("mousedown", handleClickOutside, true);
      frameDoc.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (frameDoc) {
        frameDoc.removeEventListener("mousedown", handleClickOutside, true);
        frameDoc.removeEventListener("keydown", handleKeyDown, true);
      }
    };
  }, [editor, isVisible, onClose, target, copiedStyle, deleteModalOpen]);

  useLayoutEffect(() => {
    if (!isVisible || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setMenuPosition(clampPosition(position, rect));
  }, [isVisible, position]);

  useEffect(() => {
    setMenuPosition(position);
  }, [position]);

  const handleEdit = () => {
    if (!target || !editor) return;
    editor.select(target);
    onClose();
  };

  const handleDuplicate = () => {
    if (!target || !editor) return;
    const clone = target.clone();
    const parent = typeof target.parent === "function" ? target.parent() : null;
    if (parent && typeof parent.append === "function") {
      parent.append(clone);
    } else if (parent && typeof parent.addComponent === "function") {
      parent.addComponent(clone);
    }
    editor.select(clone);
    onClose();
  };

  const handleDelete = () => {
    if (!target || !editor) return;
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!target || !editor) return;
    if (typeof target.remove === "function") {
      target.remove();
    } else if (typeof target.parent === "function") {
      const parent = target.parent();
      parent?.remove(target);
    }
    setDeleteModalOpen(false);
    onClose();
  };

  const handleSaveAsTemplate = async () => {
    if (!target || !storeScopeId) return;
    const name = "Mon bloc";

    try {
      await savedBlockService.createSavedBlock(storeScopeId, {
        name,
        category: "BibliothÃ¨que",
        componentJson: target.toJSON(),
        isSynced: false,
      });
    } catch (err) {
      console.error("save as template failed", err);
    }
    onClose();
  };

  const handleCopyStyle = () => {
    if (!target) return;
    const style = target.getStyle ? target.getStyle() : target.get("style");
    if (!style) return;
    setCopiedStyle(style);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  };

  const handlePasteStyle = () => {
    if (!target || !copiedStyle) return;
    if (typeof target.setStyle === "function") {
      target.setStyle(copiedStyle);
    } else if (typeof target.set === "function") {
      target.set("style", copiedStyle);
    }
    onClose();
  };

  if (!isVisible || !target) return null;

  return (
    <>
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPosition.y,
          left: menuPosition.x,
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "12px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
          zIndex: 10010,
          minWidth: "240px",
          padding: "4px 0",
          color: "#f8fafc",
          fontSize: "13px",
        }}
      >
        <MenuItem icon={<FiEdit3 />} label="Editer" shortcut="EntrÃ©e" onClick={handleEdit} disabled={!target} />
        <MenuItem icon={<FiCopy />} label="Dupliquer" shortcut="Ctrl+D" onClick={handleDuplicate} disabled={!canDuplicate} />
        <MenuItem icon={<FiScissors />} label="Copier le style" shortcut="Ctrl+C" onClick={handleCopyStyle} disabled={!target} />
        <MenuItem
          icon={<FiClipboard />}
          label="Coller le style"
          shortcut="Ctrl+V"
          onClick={handlePasteStyle}
          disabled={!canPasteStyle}
        />
        <MenuItem
          icon={<FiSave />}
          label="Sauvegarder dans la bibliothÃ¨que"
          shortcut="Ctrl+S"
          onClick={handleSaveAsTemplate}
          disabled={!canSaveAsTemplate}
        />
        <div style={{ height: "1px", background: "#374151", margin: "6px 0" }} />
        <MenuItem
          icon={<FiTrash2 />}
          label="Supprimer"
          shortcut="Suppr"
          onClick={handleDelete}
          danger
          disabled={!canDelete}
        />
      </div>
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
          <span className="flex justify-center text-3xl mb-6 text-yellow-500">
            <FiAlertTriangle />
          </span>
          <h2 className="text-xl font-medium mb-2">Supprimer l'Ã©lÃ©ment</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ÃŠtes-vous sÃ»r de vouloir supprimer cet Ã©lÃ©ment ? Cette action est irrÃ©versible.
          </p>
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button
            className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
            layout="outline"
            onClick={() => setDeleteModalOpen(false)}
          >
            Annuler
          </Button>
          <Button onClick={confirmDelete} className="w-full h-12 sm:w-auto">
            Supprimer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

const MenuItem = ({ icon, label, shortcut, onClick, danger, disabled }) => (
  <Button
    type="button"
    onClick={!disabled ? onClick : undefined}
    disabled={disabled}
    style={{
      width: "100%",
      padding: "11px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      cursor: disabled ? "not-allowed" : "pointer",
      color: danger ? "#fca5a5" : "#e5e7eb",
      opacity: disabled ? 0.45 : 1,
      transition: "background 0.15s, color 0.15s",
      userSelect: "none",
      border: "none",
      background: "transparent",
      textAlign: "left",
      font: "inherit",
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ width: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </span>
      <span>{label}</span>
    </div>
    {shortcut && (
      <span style={{ opacity: 0.6, fontSize: 11, letterSpacing: "0.02em" }}>
        {shortcut}
      </span>
    )}
  </Button>
);

export default ContextMenu;
