import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical } from "react-icons/fi";
import { IconButton, Button } from "@sofia/ui";

const GAP = 6;

const computePosition = (anchorRect, menuRect, align = "right") => {
  if (!anchorRect || !menuRect) return { top: 0, left: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = anchorRect.bottom + GAP;
  let left =
    align === "right"
      ? anchorRect.right - menuRect.width
      : anchorRect.left;

  if (left + menuRect.width + 8 > vw) {
    left = Math.max(8, vw - menuRect.width - 8);
  }
  if (top + menuRect.height + 8 > vh) {
    top = anchorRect.top - menuRect.height - GAP;
  }
  if (top < 8) top = 8;
  if (left < 8) left = 8;
  return { top, left };
};

/**
 * A small action-menu component that renders into document.body via a portal,
 * so it escapes `overflow: hidden` / `overflow-x-auto` containers (cards,
 * tables, drawers). Pass the trigger element so the popover can position
 * itself relative to it.
 */
const PopoverMenu = ({
  triggerRef,
  isOpen,
  onClose,
  align = "right",
  items = [],
  ariaLabel = "Actions",
  width = 180,
}) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = triggerRef?.current?.getBoundingClientRect?.();
    const menu = menuRef.current?.getBoundingClientRect?.();
    if (anchor && menu) {
      setPos(computePosition(anchor, menu, align));
    } else if (anchor) {
      const fallback = computePosition(anchor, { width, height: 0 }, align);
      setPos(fallback);
    }
  }, [isOpen, triggerRef, align, width]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleDown = (e) => {
      const menu = menuRef.current;
      const trigger = triggerRef?.current;
      if (!menu) return;
      if (menu.contains(e.target)) return;
      if (trigger && trigger.contains(e.target)) return;
      onClose?.();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 10000,
        minWidth: width,
      }}
      className="rounded-md border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-gray-700 dark:bg-gray-800"
    >
      {items
        .filter((item) => !item.hidden)
        .map((item, idx) => (
          <Button
            key={item.key || idx}
            type="button"
            variant="ghost"
            size="sm"
            as="div"
            role="menuitem"
            disabled={item.disabled}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
              item.onClick?.(e);
            }}
            className={[
              "flex w-full items-center gap-2 px-3 py-2 text-left justify-start rounded-none",
              item.danger ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-200",
              className,
            ].join(" ")}
          >
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            <span className="truncate">{item.label}</span>
          </Button>
        ))}
    </div>,
    document.body
  );
};

const PopoverMenuTrigger = React.forwardRef(function PopoverMenuTrigger(
  { onClick, "aria-label": ariaLabel, icon: Icon = FiMoreVertical, className = "" },
  ref
) {
  return (
    <IconButton
      ref={ref}
      variant="outline"
      size="sm"
      iconOnly
      aria-label={ariaLabel || "Actions"}
      aria-haspopup="menu"
      onClick={onClick}
      className={className}
    >
      <Icon className="h-4 w-4" />
    </IconButton>
  );
});

export { PopoverMenu, PopoverMenuTrigger };
export default PopoverMenu;