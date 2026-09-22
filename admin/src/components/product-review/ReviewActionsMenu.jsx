import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
import { Button } from "@sofia/ui";
  FiAlertOctagon,
  FiCheck,
  FiCornerUpLeft,
  FiMoreVertical,
  FiSlash,
  FiTrash2,
} from "react-icons/fi";
import ActionMenuItem from "@/components/table/ActionMenuItem";

const MENU_WIDTH = 176; // w-44

// Kebab menu for a review row â€” keeps the actions column a single fixed-width
// icon so the table never overflows horizontally (same pattern as
// components/tag/TagActionsMenu.jsx).
const ReviewActionsMenu = ({
  review,
  disabled,
  onReply,
  onApprove,
  onReject,
  onSpam,
  onDelete,
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

  const items = [
    onReply && {
      key: "reply",
      label: t("ReviewsReply"),
      icon: FiCornerUpLeft,
      hoverClass: "hover:text-blue-600 dark:hover:text-blue-400",
      onClick: () => onReply(review),
    },
    onApprove &&
      review.status !== "approved" && {
        key: "approve",
        label: t("Approve"),
        icon: FiCheck,
        hoverClass: "hover:text-emerald-600 dark:hover:text-emerald-400",
        onClick: () => onApprove(review._id),
      },
    onReject &&
      review.status !== "rejected" && {
        key: "reject",
        label: t("Reject"),
        icon: FiSlash,
        hoverClass: "hover:text-orange-500 dark:hover:text-orange-400",
        onClick: () => onReject(review._id),
      },
    onSpam &&
      review.status !== "spam" && {
        key: "spam",
        label: t("MarkAsSpam"),
        icon: FiAlertOctagon,
        hoverClass: "hover:text-red-600 dark:hover:text-red-400",
        onClick: () => onSpam(review._id),
      },
    onDelete && {
      key: "delete",
      label: t("Delete"),
      icon: FiTrash2,
      hoverClass: "hover:text-red-600 dark:hover:text-red-400",
      onClick: () => onDelete(review._id),
    },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={openMenu}
        className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none disabled:opacity-40"
      >
        <FiMoreVertical className="w-5 h-5" />
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
            {items.map(({ key, label, icon: Icon, hoverClass, onClick }) => (
              <li key={key}>
                <Button
                  type="button"

                  onClick={() => {
                    setIsOpen(false);
                    onClick();
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 ${hoverClass}`}
                  icon={<Icon className="w-4 h-4" />}
                >
                  {label}
                </Button>

              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
};

export default ReviewActionsMenu;
