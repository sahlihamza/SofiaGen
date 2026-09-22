import React, { useEffect, useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { IconPickerModal, IconDisplay } from "../../../icon-system/components";
import { IconProvider } from "../../../icon-system/context/IconContext";
import { Button } from "@sofia/ui";

function parseIconValue(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // not JSON, return null
    }
  }
  return null;
}

function serializeIcon(icon) {
  if (!icon) return "";
  if (typeof icon === "string") return icon;
  return JSON.stringify(icon);
}

function IconPickerTraitFieldInner({ value, onChange, storeId }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = useMemo(() => parseIconValue(value), [value]);
  const { loadCustomIconsFromServer } = useIconContext();

  useEffect(() => {
    if (storeId) {
      loadCustomIconsFromServer();
    }
  }, [storeId, loadCustomIconsFromServer]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-sm transition hover:border-blue-400 dark:border-gray-700 dark:bg-gray-800"
        >
          {selected ? (
            <>
              <IconDisplay icon={selected} size={18} />
              <span className="flex-1 truncate text-gray-900 dark:text-gray-100">{selected.name}</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              <span className="text-gray-400">Choisir une icÃ´ne</span>
            </>
          )}
        </Button>
        {selected && (
          <Button
            type="button"
            onClick={() => onChange?.("")}
            className="rounded-md border border-gray-200 p-2 text-xs text-red-500 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/30"
            title="Retirer l'icÃ´ne"
          >
            âœ•
          </Button>

        )}
      </div>
      <IconPickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={(icon) => {
          onChange?.(serializeIcon(icon));
          setIsOpen(false);
        }}
        selectedIcon={selected}
        storeId={storeId}
        size={18}
      />
    </div>
  );
}

export default function IconPickerTraitField({ value, onChange, storeId }) {
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!containerRef.current.__root) {
      containerRef.current.__root = createRoot(containerRef.current);
    }
    containerRef.current.__root.render(
      <IconProvider storeId={storeId || window.__STORE_ID__}>
        <IconPickerTraitFieldInner value={value} onChange={onChange} storeId={storeId || window.__STORE_ID__} />
      </IconProvider>
    );

    return () => {
      if (containerRef.current?.__root) {
        containerRef.current.__root.unmount();
        containerRef.current.__root = null;
      }
    };
  }, [value, onChange, storeId]);

  return <div ref={containerRef} />;
}
