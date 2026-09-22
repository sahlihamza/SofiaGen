import React, { useState } from "react";
import { useIconContext } from "../context/IconContext";
import { IconPickerModal } from "../components/IconPickerModal";
import { IconPreview } from "../components/IconPreview";
import { Button } from "@sofia/ui";

export function IconPickerTrigger({
  value = null,
  onChange,
  storeId,
  label = "IcÃ´ne",
  placeholder = "Choisir une icÃ´ne",
  size = 24,
  className = "",
  disabled = false,
  allowClear = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { libraries } = useIconContext();

  const selectedIcon = value || null;

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">{label}</label>}
      <Button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={[
          "flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-blue-400 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500",
        ].join(" ")}
        aria-label={placeholder}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-gray-700">
          {selectedIcon ? (
            <IconPreview icon={selectedIcon} size={size} />
          ) : (
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          )}
        </div>
        <div className="flex-1 truncate">
          <span className={["text-sm", selectedIcon ? "text-gray-900 dark:text-gray-100" : "text-gray-400"].join(" ")}>
            {selectedIcon ? selectedIcon.name : placeholder}
          </span>
          {selectedIcon && (
            <span className="ml-2 text-xs text-gray-400">{selectedIcon.libraryName || selectedIcon.libraryId}</span>
          )}
        </div>
        {allowClear && selectedIcon && !disabled && (
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(null);
            }}
            className="rounded p-1 text-gray-400 transition hover:text-red-500"
            aria-label="Effacer l'icÃ´ne"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </Button>

      <IconPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(icon) => onChange?.(icon)}
        selectedIcon={selectedIcon}
        storeId={storeId}
        size={size}
      />
    </div>
  );
}
