import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@sofia/ui";


// Small anchored popup used by the row actions. It renders into document.body
// so the table's `overflow-x-auto` can never clip it, which is why the trigger
// rect is measured on open and the menu closes on scroll/resize.
const OrderMenu = ({ renderTrigger, items, width = 210, align = "right" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const close = useCallback(() => setIsOpen(false), []);

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = align === "right" ? rect.right - width : rect.left;
      setPosition({
        top: rect.bottom + 4,
        // keep the menu inside the viewport on narrow screens
        left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
      });
    }
    setIsOpen(true);
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

  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;

  return (
    <>
      {renderTrigger({
        ref: triggerRef,
        isOpen,
        onClick: () => (isOpen ? close() : open()),
      })}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width }}
            className="fixed z-50 overflow-hidden rounded-md border border-[#dcdcde] bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            {visibleItems.map((item) =>
              item.type === "separator" ? (
                <div
                  key={item.key}
                  className="my-1 border-t border-[#f0f0f1] dark:border-gray-700"
                />
              ) : item.type === "title" ? (
                <p
                  key={item.key}
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8c8f94] dark:text-gray-500"
                >
                  {item.label}
                </p>
              ) : (
                <Button

                  key={item.key}
                  to={item.to}
                  href={item.href}
                  disabled={item.disabled}
                  onClick={() => {
                    close();
                    item.onClick?.();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.danger
                      ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                      : "text-[#1d2327] hover:bg-[#f6f7f7] dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                  icon={item.icon}
                  trailing={item.trailing}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.trailing}
                </Button>

              )
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default OrderMenu;
