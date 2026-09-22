import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FiCopy, FiEdit, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import { Button } from "@sofia/ui";


const MENU_WIDTH = 176;
const MENU_MARGIN = 8;

const ActionMenu = ({
  id,
  title,
  product,
  isCheck,
  handleUpdate,
  handleClone,
  handleModalOpen,
  showEdit = true,
  showClone = true,
  showDelete = true,
  extraActions = [],
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const disabled = isCheck?.length > 0;

  const close = useCallback(() => setIsOpen(false), []);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const viewportRight = window.innerWidth;
      const viewportBottom = window.innerHeight;
      let left = rect.right - MENU_WIDTH;
      if (left < MENU_MARGIN) {
        left = MENU_MARGIN;
      }
      let top = rect.bottom + MENU_MARGIN;
      if (top + 220 > viewportBottom) {
        top = rect.top - MENU_MARGIN - 220;
      }
      setPosition({ top: top + window.scrollY, left: left + window.scrollX });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !triggerRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    const handleKeyDown = (e) => e.key === "Escape" && close();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, close]);

  const runAction = (action) => {
    close();
    action?.();
  };

  const items = [
    showEdit && {
      key: "edit",
      Icon: FiEdit,
      label: t("Edit"),
      className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
      onClick: () => handleUpdate(id),
    },
    showClone &&
      handleClone && {
        key: "clone",
        Icon: FiCopy,
        label: t("Clone"),
        className: "text-gray-500 dark:text-gray-400 hover:text-blue-600",
        onClick: () => handleClone(id, product),
      },
    ...extraActions.filter((a) => a.show !== false),
    showDelete && {
      key: "delete",
      Icon: FiTrash2,
      label: t("Delete"),
      className: "text-gray-500 dark:text-gray-400 hover:text-red-600",
      onClick: () => handleModalOpen(id, title, product),
    },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <div className="relative flex justify-end text-right">
      <Button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("Actions")}
        onClick={openMenu}
        className="p-2 rounded-full cursor-pointer text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiMoreVertical size={18} />
      </Button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-50 py-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md shadow-lg"
          >
            {items.map(({ key, Icon, label, className, onClick }) => (
              <Button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => runAction(onClick)}
                className={`flex items-center w-full gap-3 px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none ${className}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Button>

            ))}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ActionMenu;
