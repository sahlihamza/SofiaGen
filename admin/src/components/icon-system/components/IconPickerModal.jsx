import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIconContext } from "../context/IconContext";
import { useIcons, useIconSearch, useIconFavorites, useIconRecent, useCustomIcons } from "../hooks";
import { IconGrid } from "./IconGrid";
import { iconService } from "../services/iconService";
import { Button } from "@sofia/ui";

const TABS = [
  { id: "all", label: "Toutes" },
  { id: "recent", label: "RÃ©centes" },
  { id: "favorites", label: "Favorites" },
  { id: "custom", label: "Custom" },
];

export function IconPickerModal({ isOpen, onClose, onSelect, selectedIcon, storeId, size = 28 }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [parsedIcons, setParsedIcons] = useState([]);
  const [parseError, setParseError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const { libraries, activeLibrary, setActiveLibrary, activeStyle, setActiveStyle, styleFilters, favorites, addToRecent, toggleFavorite, isFavorite, addCustomIcons, removeCustomIcon, loadCustomIconsFromServer } = useIconContext();
  const { results: searchResults, isSearching } = useIconSearch(search, { forceRefresh: true });
  const { favorites: favList, toggleFavorite: toggleFav } = useIconFavorites();
  const { recent: recentList } = useIconRecent();
  const { customIcons, isLoading: customLoading } = useCustomIcons();

  useEffect(() => {
    if (isOpen && storeId) {
      loadCustomIconsFromServer();
    }
  }, [isOpen, storeId, loadCustomIconsFromServer]);

  const filteredLibraries = useMemo(() => {
    if (activeLibrary === "custom") return libraries.filter((l) => l.isCustom);
    if (activeLibrary === "all") return libraries;
    return libraries.filter((l) => l.id === activeLibrary);
  }, [libraries, activeLibrary]);

  const displayIcons = useMemo(() => {
    if (activeTab === "favorites") return favList;
    if (activeTab === "recent") return recentList;
    if (activeTab === "custom") return customIcons;
    if (search.trim()) return searchResults;
    return [];
  }, [activeTab, favList, recentList, customIcons, searchResults, search]);

  const handleSelect = useCallback(
    (icon) => {
      addToRecent(icon);
      onSelect?.(icon);
      onClose?.();
    },
    [addToRecent, onSelect, onClose]
  );

  const handleFileSelect = useCallback(async (files) => {
    setParseError("");
    const allFiles = Array.from(files);
    const zipFiles = allFiles.filter((f) => f.name.endsWith(".zip"));
    const svgFiles = allFiles.filter((f) => (f.type === "image/svg+xml" || f.name.endsWith(".svg")) && !f.name.endsWith(".zip"));

    if (allFiles.length === 0) {
      setParseError("Veuillez sÃ©lectionner des fichiers.");
      return;
    }

    const results = [];

    for (const file of svgFiles) {
      try {
        const text = await file.text();
        const { sanitizeSvg, extractSvgNameFromFilename, parseSvgString } = await import("../utils/svgParser");
        const sanitized = sanitizeSvg(text);
        const parsed = parseSvgString(sanitized);
        if (!parsed) {
          results.push({ name: file.name, error: "SVG invalide" });
          continue;
        }
        results.push({
          name: extractSvgNameFromFilename(file.name),
          filename: file.name,
          svgContent: sanitized,
          tags: [extractSvgNameFromFilename(file.name).split("-")[0]],
          viewBox: parsed.viewBox,
          width: parsed.width,
          height: parsed.height,
        });
      } catch (err) {
        results.push({ name: file.name, error: err.message });
      }
    }

    for (const file of zipFiles) {
      try {
        setParseError(`Upload du ZIP "${file.name}" vers le serveur...`);
        const uploadRes = await iconService.uploadZip(file);
        const parsedIcons = (uploadRes.icons || []).map((ic) => ({
          name: ic.name,
          filename: ic.filename || `${ic.name}.svg`,
          svgContent: ic.svgContent,
          tags: ic.tags || [ic.name.split("-")[0]],
          viewBox: ic.viewBox || "0 0 24 24",
          width: ic.width || 24,
          height: ic.height || 24,
        }));
        results.push(...parsedIcons);
        if (uploadRes.errors && uploadRes.errors.length > 0) {
          setParseError(`${uploadRes.errors.length} fich(s) ignorÃ©s dans le ZIP`);
        }
      } catch (err) {
        results.push({ name: file.name, error: err.message || "Ã‰chec de l'upload du ZIP" });
      }
    }

    setParsedIcons(results.filter((r) => !r.error));
    if (results.some((r) => r.error)) {
      const errCount = results.filter((r) => r.error).length;
      setParseError(`${errCount} fichier(s) non traitÃ©(s).`);
    }
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (parsedIcons.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const batchSize = 10;
      let created = [];
      for (let i = 0; i < parsedIcons.length; i += batchSize) {
        const batch = parsedIcons.slice(i, i + batchSize);
        if (storeId) {
          const res = await iconService.batchCreate({ storeId, icons: batch });
          created = created.concat(res.created || []);
        }
        setUploadProgress(Math.min(100, Math.round(((i + batchSize) / parsedIcons.length) * 100)));
      }
      addCustomIcons(created);
      setParsedIcons([]);
      setSelectedFiles([]);
      setShowUploadZone(false);
    } catch (err) {
      setParseError(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [parsedIcons, storeId, addCustomIcons]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleInputChange = useCallback((e) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6" onClick={onClose}>
      <div
        className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="SÃ©lecteur d'icÃ´nes"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Choisir une icÃ´ne</h2>

          <Button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Fermer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-3 border-b border-gray-200 px-5 py-3 dark:border-gray-700">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une icÃ´ne..."
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  aria-label="Rechercher une icÃ´ne"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                )}
              </div>
              <select
                value={activeLibrary}
                onChange={(e) => setActiveLibrary(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                aria-label="BibliothÃ¨que"
              >
                <option value="all">Toutes les bibliothÃ¨ques</option>
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => {
                const count = tab.id === "recent" ? recentList.length : tab.id === "favorites" ? favList.length : tab.id === "custom" ? customIcons.length : undefined;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "rounded-full px-3 py-1.5 text-sm font-medium transition",
                      activeTab === tab.id
                        ? "border border-blue-600 bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
                    ].join(" ")}
                  >
                    {tab.label}
                    {count !== undefined && <span className="ml-1.5 text-xs opacity-75">({count})</span>}
                  </Button>
                );
              })}
              <div className="ml-auto">
                <Button
                  type="button"
                  onClick={() => setShowUploadZone(!showUploadZone)}
                  className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <svg className="mr-1 inline h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload
                </Button>
              </div>
            </div>

            {activeTab === "all" && (
              <div className="flex flex-wrap gap-1.5">
                {styleFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveStyle(filter.id)}
                    className={[
                      "rounded-md px-2.5 py-1 text-xs font-medium transition",
                      activeStyle === filter.id
                        ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                    ].join(" ")}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            )}

            {showUploadZone && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={[
                  "rounded-lg border-2 border-dashed p-6 text-center transition",
                  dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600",
                ].join(" ")}
              >
                <input
                  type="file"
                  id="icon-upload-input"
                  multiple
                  accept=".svg,.zip"
                  onChange={handleInputChange}
                  className="hidden"
                />
                <label htmlFor="icon-upload-input" className="cursor-pointer">
                  <svg className="mx-auto mb-2 h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Glissez vos icÃ´nes SVG ou ZIP ici ou <span className="text-blue-600 underline">parcourez</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">Formats acceptÃ©s: SVG, ZIP (pack d'icÃ´nes)</p>
                </label>

                {parsedIcons.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {parsedIcons.length} icÃ´ne(s) prÃªte(s) Ã  uploader
                    </p>
                    <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
                      {parsedIcons.map((ic) => (
                        <span key={ic.name} className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">
                          {ic.name}
                        </span>
                      ))}
                    </div>
                    {parseError && <p className="mt-2 text-xs text-red-500">{parseError}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        onClick={handleConfirmUpload}
                        disabled={uploading}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploading ? `Upload... ${uploadProgress}%` : "Confirmer l'upload"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => { setParsedIcons([]); setSelectedFiles([]); setParseError(""); }}
                        className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden px-5 pb-4">
            {customLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : (
              <IconGrid
                icons={displayIcons}
                selectedIcon={selectedIcon}
                onSelect={handleSelect}
                onToggleFavorite={activeTab === "favorites" ? undefined : toggleFav}
                isFavorite={isFavorite}
                size={size}
              />
            )}
          </div>
        </div>

        {selectedIcon && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700">
                <IconPreview icon={selectedIcon} size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedIcon.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedIcon.libraryName || selectedIcon.libraryId}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => toggleFav(selectedIcon)}
                className={[
                  "rounded-lg p-2 transition",
                  isFavorite(selectedIcon) ? "text-yellow-500" : "text-gray-400 hover:text-yellow-500",
                ].join(" ")}
                aria-label={isFavorite(selectedIcon) ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill={isFavorite(selectedIcon) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </Button>
              <Button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                SÃ©lectionner
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
