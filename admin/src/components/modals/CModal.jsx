import React, { useEffect } from "react";

import { Button } from "@sofia/ui";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = "",
  contentClassName = "",
  closeOnOverlayClick = true,
  showCloseButton = true,
  ariaLabel,
  size = "md",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div
        className="absolute inset-0"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || "Dialog"}
        className={["relative z-10 w-full rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800", sizeClasses[size] || sizeClasses.md, className].filter(Boolean).join(" ")}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <div>
              {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
            </div>
            {showCloseButton && (
              <Button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Close dialog"
              >
                Ã—
              </Button>
            )}
          </div>
        )}

        <div className={["px-5 py-4", contentClassName].filter(Boolean).join(" ")}>{children}</div>

        {footer && <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
