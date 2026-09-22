import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FiEdit, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import { IconButton, SecondaryButton } from "@sofia/ui";


const MENU_WIDTH = 144; // w-36

const BrandActionsMenu = ({
  onEdit,
  onDelete,
  isSubmitting,
  showEdit = true,
  showDelete = true,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef();
  const menuRef = useRef();

  const openMenu = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - MENU_WIDTH,
      });
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (e) => {
      if (
        !menuRef?.current?.contains(e.target) &&
        !buttonRef?.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleReposition = () => setIsOpen(false);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen]);

  if (!showEdit && !showDelete) return null;

  return (
    <>
      <IconButton
        type="button"
        ref={buttonRef}
        variant="ghost"
        size="sm"
        iconOnly
        onClick={openMenu}
        className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none"
      >
        <FiMoreVertical className="w-5 h-5" />
      </IconButton>

      {isOpen &&
        createPortal(
          <ul
            ref={menuRef}
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              width: MENU_WIDTH,
            }}
            className="z-50 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 focus:outline-none"
          >
            {showEdit && (
              <li>
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"

                  disabled={isSubmitting}
                  onClick={() => {
                    setIsOpen(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400 rounded-none justify-start"

                >
                  {t("Edit")}
                </SecondaryButton>

              </li>
            )}

            {showDelete && (
              <li>
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"

                  disabled={isSubmitting}
                  onClick={() => {
                    setIsOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400 rounded-none justify-start"

                >
                  {t("Delete")}
                </SecondaryButton>

              </li>
            )}
          </ul>,
          document.body
        )}
    </>
  );
};

export default BrandActionsMenu;
