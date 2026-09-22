import React, { useMemo } from "react";
import { IconPreview } from "./IconPreview";
import { Button } from "@sofia/ui";

const ITEM_HEIGHT = 72;
const ITEM_WIDTH = 80;
const OVERSCAN = 6;

export function IconGrid({ icons = [], selectedIcon, onSelect, onToggleFavorite, isFavorite, size = 28, columns }) {
  const containerRef = React.useRef(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(500);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cols = columns || Math.max(2, Math.floor((containerHeight || 500) / ITEM_HEIGHT));
  const rows = Math.ceil(icons.length / cols);
  const totalHeight = rows * ITEM_HEIGHT;
  const startRow = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endRow = Math.min(rows - 1, Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN);
  const startIndex = startRow * cols;
  const endIndex = Math.min(icons.length - 1, endRow * cols + cols - 1);

  const visibleIcons = useMemo(() => {
    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < icons.length) {
        visible.push({ icon: icons[i], index: i });
      }
    }
    return visible;
  }, [icons, startIndex, endIndex]);

  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (icons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="mb-2 h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <p className="text-sm">Aucune icÃ´ne trouvÃ©e</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto overflow-x-hidden"
      style={{ contain: "strict" }}
      role="listbox"
      aria-label="IcÃ´nes disponibles"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleIcons.map(({ icon, index }) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const left = (col / cols) * 100;
          const top = row * ITEM_HEIGHT;
          const isSelected = selectedIcon?.id === icon.id && selectedIcon?.libraryId === icon.libraryId;

          return (
            <div
              key={`${icon.libraryId}-${icon.id}`}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => onSelect?.(icon)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(icon);
                }
              }}
              className={[
                "absolute flex cursor-pointer flex-col items-center justify-center rounded-lg border transition",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30"
                  : "border-transparent hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800",
              ].join(" ")}
              style={{ left: `${left}%`, top, width: `${100 / cols}%`, height: ITEM_HEIGHT }}
            >
              <div className="flex items-center justify-center" style={{ width: size + 8, height: size + 8 }}>
                <IconPreview icon={icon} size={size} />
              </div>
              <span className="mt-1 truncate px-1 text-center text-[10px] text-gray-500 dark:text-gray-400" style={{ maxWidth: `${100 / cols - 4}%` }}>
                {icon.name}
              </span>
              {onToggleFavorite && (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(icon);
                  }}
                  className={[
                    "absolute right-1 top-1 rounded p-0.5 opacity-0 transition",
                    isFavorite(icon) ? "opacity-100 text-yellow-500" : "text-gray-300 hover:text-yellow-400 group-hover:opacity-100",
                  ].join(" ")}
                  aria-label={isFavorite(icon) ? "Retirer des favoris" : "Ajouter aux favoris"}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={isFavorite(icon) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
