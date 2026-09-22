import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FiEdit, FiMoreVertical, FiTrash2, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { Button } from "@sofia/ui";


const MENU_WIDTH = 180;

const PaymentProviderActionsMenu = ({
  row,
  canConfigure,
  canEnable,
  canDisable,
  canDelete,
  onConfigure,
  onEnable,
  onDisable,
  onDelete,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

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
      if (!menuRef?.current?.contains(e.target) && !buttonRef?.current?.contains(e.target)) {
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

  const items = [];
  if (canConfigure) {
    items.push({
      key: "configure",
      Icon: FiEdit,
      label: t("Configure") || "Configure",
      className: "text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400",
      onClick: () => {
        setIsOpen(false);
        onConfigure(row);
      },
    });
  }
  if (row.enabled !== false && canDisable) {
    items.push({
      key: "disable",
      Icon: FiToggleLeft,
      label: t("Disable") || "Disable",
      className: "text-gray-600 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400",
      onClick: () => {
        setIsOpen(false);
        onDisable(row._id);
      },
    });
  }
  if (row.enabled === false && canEnable) {
    items.push({
      key: "enable",
      Icon: FiToggleRight,
      label: t("Enable") || "Enable",
      className: "text-gray-600 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400",
      onClick: () => {
        setIsOpen(false);
        onEnable(row._id);
      },
    });
  }
  if (canDelete) {
    items.push({
      key: "delete",
      Icon: FiTrash2,
      label: t("Delete") || "Delete",
      className: "text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400",
      onClick: () => {
        setIsOpen(false);
        if (window.confirm(t("ConfirmDeleteProvider") || `Delete ${row.name}?`)) {
          onDelete(row._id);
        }
      },
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative flex justify-end text-right">
      <Button
        ref={buttonRef}
        type="button"
        onClick={openMenu}
        className="p-2 rounded-full cursor-pointer text-gray-400 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
      >
        <FiMoreVertical size={18} />
      </Button>

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
            {items.map(({ key, Icon, label, className, onClick }) => (
              <li key={key}>
                <Button
                  type="button"

                  disabled={isLoading}
                  onClick={onClick}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none ${className}`}
                  icon={<Icon size={16} />}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Button>

              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
};

export default PaymentProviderActionsMenu;
