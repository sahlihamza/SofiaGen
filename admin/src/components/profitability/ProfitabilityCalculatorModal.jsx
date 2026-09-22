import React, { useEffect, useRef } from "react";

import Modal from "@/components/ui/Modal.jsx";
import ProfitabilityCalculator from "./ProfitabilityCalculator.jsx";
import { Button } from "@sofia/ui";

/**
 * Modal wrapper around the reusable {@link ProfitabilityCalculator}.
 *
 * The wrapper handles:
 *  - focus trap + restoration (the existing `<Modal>` primitive only
 *    handles ESC; focus management is layered here to keep the primitive
 *    generic).
 *  - the close button + title + aria labels.
 *  - pass-through of every calculator prop (initialValues, onCalculate, â€¦).

 *
 * The calculator itself is intentionally modal-agnostic, so the same
 * component can later be dropped in a drawer or a dashboard widget.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const ProfitabilityCalculatorModal = ({
  open,
  onClose,
  title = "Calculateur de RentabilitÃ©",

  currency,
  initialValues,
  onChange,
  onCalculate,
  compact = false,
}) => {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Focus trap + restoration.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement;

    const container = containerRef.current;
    if (!container) return;

    // Move initial focus into the modal.
    const focusables = container.querySelectorAll(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const items = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [open]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="regular"
      className="sm:max-w-3xl"
      aria-label={title}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="flex max-h-[90vh] flex-col overflow-y-auto outline-none"
      >
        <header className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <span aria-hidden="true">ðŸ§®</span>

            <span>{title}</span>
          </h2>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </header>

        <div className="pt-4">
          <ProfitabilityCalculator
            currency={currency}
            initialValues={initialValues}
            onChange={onChange}
            onCalculate={onCalculate}
            compact={compact}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ProfitabilityCalculatorModal;