import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import CSectionHeader from "@/components/common/CSectionHeader";
import Button from "@/components/ui/CButton";
import GjsEditorShell from "@/components/theme-editor/GjsEditorShell";
import { EditorProvider, useEditor } from "@/components/theme-editor/hooks/editor/EditorProvider";
import ThemeSettingsPanel from "@/components/theme-editor/panels/ThemeSettings";
import SearchBar from "@/components/tables/CSearchBar";
import ConfirmModal from "@/components/modals/CConfirmModal";
import { notifySuccess, notifyError } from "@/utils/toast";
import httpService from "@/services/httpService";
import userService from "@/services/userService";
import ThemeEditorServices from "@/services/ThemeEditorServices";

/* -------------------------------------------------------------------------
 * HiddenCanvasHost
 * THEME-02: EditorProvider's bootstrap (theme fetch, page fetch, GrapesJS
 * init) only runs once editorRef is attached to a real DOM node â€” normally
 * that's the visible canvas. For a Level 1 store (no "builder" Plan
 * feature), we still need that bootstrap to run so ThemeSettingsPanel gets
 * a real theme to edit, but the block-editing canvas itself must never be
 * shown. Mounting the ref on an invisible div satisfies the former without
 * doing the latter â€” nothing block-editing-related is rendered at all.
 * ---------------------------------------------------------------------- */
const HiddenCanvasHost = () => {
  const { editorRef } = useEditor();
  return <div ref={editorRef} style={{ display: "none" }} aria-hidden="true" />;
};

/* -------------------------------------------------------------------------
 * ThemePreview
 * A tiny, purely-CSS "screenshot" of a storefront built from the theme's own
 * color tokens. Stands in for the real screenshot Shopify/WordPress show,
 * without needing actual image assets.
 * ---------------------------------------------------------------------- */
const ThemePreview = ({ colors, size = "md" }) => {
  const [accent, surface, panel, sale, muted] = colors;
  const isLarge = size === "lg";
  const height = isLarge ? "h-80 sm:h-[420px]" : "h-36";
  const gridRowHeight = isLarge ? 96 : 22;

  return (
    <div
      className={`relative w-full ${height} overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700`}
      style={{ backgroundColor: surface }}
    >
      {/* fake browser chrome */}
      <div className={`flex items-center gap-1.5 bg-white/70 border-b border-black/5 ${isLarge ? "px-4 py-3" : "px-2 py-1.5"}`}>
        <span className={`rounded-full bg-black/15 ${isLarge ? "w-3 h-3" : "w-1.5 h-1.5"}`} />
        <span className={`rounded-full bg-black/15 ${isLarge ? "w-3 h-3" : "w-1.5 h-1.5"}`} />
        <span className={`rounded-full bg-black/15 ${isLarge ? "w-3 h-3" : "w-1.5 h-1.5"}`} />
      </div>

      {/* fake site header */}
      <div className={`flex items-center justify-between ${isLarge ? "px-6 py-4" : "px-3 py-2"}`}>
        <span className={`rounded-full ${isLarge ? "h-3 w-16" : "h-1.5 w-8"}`} style={{ backgroundColor: accent }} />
        <div className={isLarge ? "flex gap-3" : "flex gap-1.5"}>
          <span className={`rounded-full bg-black/10 ${isLarge ? "h-2 w-8" : "h-1 w-4"}`} />
          <span className={`rounded-full bg-black/10 ${isLarge ? "h-2 w-8" : "h-1 w-4"}`} />
          <span className={`rounded-full bg-black/10 ${isLarge ? "h-2 w-8" : "h-1 w-4"}`} />
        </div>
      </div>

      {/* fake hero */}
      <div className={`rounded-md ${isLarge ? "mx-6 mb-5 px-6 py-8" : "mx-3 mb-2 px-3 py-3"}`} style={{ backgroundColor: panel }}>
        <span className={`block rounded-full ${isLarge ? "h-4 w-2/3 mb-3" : "h-2 w-2/3 mb-1.5"}`} style={{ backgroundColor: accent }} />
        <span className={`block rounded-full bg-black/10 ${isLarge ? "h-2.5 w-1/2 mb-2" : "h-1 w-1/2 mb-1"}`} />
        <span className={`block rounded-full bg-black/10 ${isLarge ? "h-2.5 w-1/3 mb-4" : "h-1 w-1/3 mb-2"}`} />
        <span
          className={`inline-block rounded-full ${isLarge ? "h-5 w-24" : "h-2.5 w-10"}`}
          style={{ backgroundColor: accent }}
        />
      </div>

      {/* fake product grid */}
      <div className={`grid grid-cols-3 ${isLarge ? "gap-3 px-6" : "gap-1.5 px-3"}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative rounded-sm" style={{ backgroundColor: muted, height: gridRowHeight }}>
            {i === 0 && (
              <span
                className={`absolute rounded-full ${isLarge ? "top-1.5 right-1.5 h-3 w-3" : "top-0.5 right-0.5 h-1.5 w-1.5"}`}
                style={{ backgroundColor: sale }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
 * Icons (kept as inline SVG to match the rest of the file's convention)
 * ---------------------------------------------------------------------- */
const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconEye = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconDots = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);
const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
const IconDuplicate = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconExport = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconRename = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */
const Themes = () => {
  const { t } = useTranslation();
  const getValidStoreId = (value) =>
    typeof value === "string" && /^[a-f\d]{24}$/i.test(value) ? value : null;

  // storeId = company cookie (same token httpService sends in the 'company' header)
  const getInitialStoreId = () => {
    const comp = getValidStoreId(Cookies.get("company"));
    if (comp) return comp;
    try {
      const adminInfo = Cookies.get("adminInfo") ? JSON.parse(Cookies.get("adminInfo")) : null;
      return getValidStoreId(adminInfo?.company || adminInfo?.storeId);
    } catch {
      return null;
    }
  };

  const [resolvedStoreId, setResolvedStoreId] = useState(getInitialStoreId());
  const [searchValue, setSearchValue] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [editorThemeId, setEditorThemeId] = useState(null); // null = closed â€” Level 2 (full canvas)
  const [appearanceThemeId, setAppearanceThemeId] = useState(null); // null = closed â€” Level 1 (ThemeSettings only)
  const [themes, setThemes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [themeToRename, setThemeToRename] = useState(null);
  const [newThemeName, setNewThemeName] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogThemes, setCatalogThemes] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [applyingCatalogId, setApplyingCatalogId] = useState(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest(".theme-action-menu")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const setStoreCookie = (storeId) => {
    Cookies.set("company", storeId, {
      expires: 0.5,
      sameSite: window.location.protocol === "https:" ? "None" : "Lax",
      secure: window.location.protocol === "https:",
    });
  };

  const resolveStoreId = async () => {
    // A user ID is not a store ID. Prefer the globally selected store over the
    // legacy company cookie, which older login responses populated with _id.
    const stores = await httpService.get("/stores/");
    const selectedStore = Array.isArray(stores)
      ? stores.find((store) => store.isSelected) || stores.find((store) => store.isActive)
      : null;
    if (selectedStore?._id) {
      const storeId = String(selectedStore._id);
      if (resolvedStoreId !== storeId) setResolvedStoreId(storeId);
      setStoreCookie(storeId);
      return storeId;
    }

    const currentId = getInitialStoreId();
    if (currentId) return currentId;

    const me = await userService.getMe();
    const fallbackStoreId = getValidStoreId(me?.company || me?.storeId || me?.store);
    if (fallbackStoreId) {
      setResolvedStoreId(fallbackStoreId);
      setStoreCookie(fallbackStoreId);
    }
    return fallbackStoreId;
  };
  const loadThemes = async () => {
    try {
      setIsLoading(true);
      const storeId = await resolveStoreId();
      if (!storeId) {
        console.error("Unable to determine storeId for theme list");
        setThemes([]);
        return;
      }

      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      const result = await ThemeEditorServices.getAllThemes(storeId);
      
      const themeList = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.data?.data)
        ? result.data.data
        : [];
      
      setThemes(themeList.map(th => ({
          id: th._id,
          title: th.name,
          description: th.description || "No description",
          font: th.fonts?.body || "Inter",
          headingFont: th.fonts?.heading || th.fonts?.body || "Inter",
          version: th.version || "1.0.0",
          updatedAt: th.updatedAt,
          colors: [
            th.colors?.primary || "#000",
            th.colors?.secondary || "#ccc",
            th.colors?.accent || "#000",
            th.colors?.text || "#333",
            th.colors?.background || "#fff"
          ],
          isCurrent: th.isActive,
          isDraft: th.isDraft,
        })));
    } catch (err) {
      console.error("Failed to load themes", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThemes();
  }, [resolvedStoreId]);

    const currentTheme = useMemo(() => themes.find((th) => th.isCurrent), [themes]);

  const libraryThemes = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return themes
      .filter((th) => !th.isCurrent)
      .filter(
        (th) =>
          !query ||
          th.title.toLowerCase().includes(query) ||
          th.description.toLowerCase().includes(query)
      );
  }, [themes, searchValue]);

  const activateTheme = async (id) => {
    try {
      setIsLoading(true);
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.activateTheme(id);
      await loadThemes();
    } catch (e) { 
      console.error(e); 
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.duplicateTheme(id);
      loadThemes();
    } catch (e) { console.error("Duplicate failed", e); }
  };

  const handleDelete = async (id) => {
    try {
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.deleteTheme(id);
      loadThemes();
    } catch (e) { console.error("Delete failed", e); }
  };

  const openDeleteModal = (id) => {
    setThemeToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (themeToDelete) {
      await handleDelete(themeToDelete);
      setDeleteModalOpen(false);
      setThemeToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setThemeToDelete(null);
  };

  const openRenameModal = (theme) => {
    setThemeToRename(theme);
    setNewThemeName(theme.title || theme.name || "");
    setRenameModalOpen(true);
  };

  const confirmRename = async () => {
    if (!themeToRename || !newThemeName.trim()) return;
    try {
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.updateTheme(themeToRename.id, { name: newThemeName.trim() });
      await loadThemes();
      notifySuccess("Theme renamed successfully");
      setRenameModalOpen(false);
      setThemeToRename(null);
      setNewThemeName("");
    } catch (e) {
      console.error("Rename failed", e);
      notifyError("Rename failed");
    }
  };

  const cancelRename = () => {
    setRenameModalOpen(false);
    setThemeToRename(null);
    setNewThemeName("");
  };

  const handleExport = async (id) => {
    try {
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.exportTheme(id);
    } catch (e) { console.error("Export failed", e); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsLoading(true);
      const storeId = await resolveStoreId();
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      await ThemeEditorServices.importTheme(storeId, file);
      await loadThemes();
      notifySuccess("Theme imported successfully");
    } catch (error) {
      console.error("Import failed", error);
      notifyError("Import failed: " + (error?.message || error));
      setIsLoading(false);
    }
  };

  const handlePreview = (id) => {
    // Open storefront in a new tab with preview parameter
    window.open(`${import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000"}?previewThemeId=${id}`, '_blank');
  };

  // THEME-02: real Super Admin catalog, filtered/locked server-side by the
  // store's actual Plan â€” replaces the old disconnected preset picker that
  // used to live in the store-creation wizard and had no effect at all.
  const openCatalog = async () => {
    setCatalogOpen(true);
    setCatalogLoading(true);
    try {
      const storeId = await resolveStoreId();
      const res = await httpService.get(`/theme-catalog?storeId=${storeId}`);
      setCatalogThemes(res?.data || []);
    } catch (e) {
      console.error("Failed to load theme catalog", e);
      notifyError(e?.response?.data?.message || "Failed to load theme catalog");
    } finally {
      setCatalogLoading(false);
    }
  };

  const applyCatalogTheme = async (catalogTheme) => {
    if (catalogTheme.locked) return;
    try {
      setApplyingCatalogId(catalogTheme.id);
      const storeId = await resolveStoreId();
      await httpService.post(`/stores/${storeId}/theme-catalog/${catalogTheme.id}/apply`);
      notifySuccess(`"${catalogTheme.name}" applied to your store`);
      setCatalogOpen(false);
      await loadThemes();
    } catch (e) {
      // A locked theme forced through here (e.g. stale client state) is
      // still rejected server-side â€” this message reflects that real gate.
      notifyError(e?.response?.data?.message || "Failed to apply theme");
    } finally {
      setApplyingCatalogId(null);
    }
  };

  // THEME-02: the real Level 1/Level 2 split. A store without the "builder"
  // Plan feature never gets GjsEditorShell mounted at all â€” not hidden by
  // CSS, not a disabled button, an entirely different component tree opens
  // instead. The server independently re-checks every canvas write anyway,
  // so this is about never showing the canvas, not the last line of defense.
  const openThemeEditor = async (themeId) => {
    try {
      const storeId = await resolveStoreId();
      const hasBuilderAccess = await ThemeEditorServices.getBuilderAccess(storeId);
      if (hasBuilderAccess) {
        setEditorThemeId(themeId);
      } else {
        setAppearanceThemeId(themeId);
      }
    } catch (e) {
      console.error("Failed to check builder access", e);
      setAppearanceThemeId(themeId);
    }
  };

  const handleAddTheme = async () => {
    try {
      setIsLoading(true);
      const storeId = await resolveStoreId();
      const { default: ThemeEditorServices } = await import('@/services/ThemeEditorServices');
      const newTheme = await ThemeEditorServices.createTheme({ name: "Untitled Theme", storeId });
      await loadThemes();
      await openThemeEditor(newTheme._id);
    } catch (e) {
      console.error("Failed to create theme", e);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col sm:px-4 bg-gray-50 dark:bg-gray-900 peer-[.header-fixed]/header:mt-16">
      <div className="w-full min-h-full flex-1 pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <CSectionHeader
          title={t("Themes")}
          description={t("ManageThemes")}
          actions={
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <Button variant="secondary" size="md" as="span">
                  Import Theme
import { Button } from "@sofia/ui";
                </Button>
                <input type="file" accept=".zip" className="hidden" onChange={handleImport} />
              </label>
              <Button variant="secondary" size="md" onClick={openCatalog}>
                Browse Catalog
              </Button>
              <Button variant="primary" size="md" onClick={handleAddTheme} disabled={isLoading}>
                {isLoading ? "Loading..." : "Add Theme"}
              </Button>
            </div>
          }
          className="pb-0"
        />

        {/* ---------------------------------------------------------------
         * Current theme â€” Shopify-style hero panel. Only one theme ever
         * lives here; it's the theme actually served on the storefront.
         * ------------------------------------------------------------- */}
        {currentTheme && (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              <div className="lg:w-[480px] shrink-0 p-6 lg:border-r border-gray-200 dark:border-gray-700">
                <ThemePreview colors={currentTheme.colors} size="lg" />
              </div>
              <div className="flex-1 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5">
                    <IconCheck className="w-3 h-3" />
                    Current theme
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Published, live on your store</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{currentTheme.title}</h2>
                <p className="text-base text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
                  {currentTheme.description}
                </p>

                {/* Color palette */}
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Color palette
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: "Primary", value: currentTheme.colors[0] },
                      { label: "Secondary", value: currentTheme.colors[1] },
                      { label: "Accent", value: currentTheme.colors[2] },
                      { label: "Text", value: currentTheme.colors[3] },
                      { label: "Background", value: currentTheme.colors[4] },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm shrink-0"
                          style={{ backgroundColor: c.value }}
                        />
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase">{c.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl">
                  {[
                    { label: "Version", value: currentTheme.version },
                    { label: "Body font", value: currentTheme.font },
                    { label: "Heading font", value: currentTheme.headingFont },
                    {
                      label: "Last updated",
                      value: currentTheme.updatedAt
                        ? new Date(currentTheme.updatedAt).toLocaleDateString()
                        : "â€”",
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {m.label}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    className="inline-flex items-center gap-1.5"
                    onClick={() => openThemeEditor(currentTheme?.id || "")}
                  >
                    <IconEye className="w-4 h-4" />
                    Customize
                  </Button>
                  <Button variant="secondary" size="md" className="inline-flex items-center gap-1.5" onClick={() => handlePreview(currentTheme.id)}>
                    <IconEye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button variant="secondary" size="md" className="inline-flex items-center gap-1.5" onClick={() => handleExport(currentTheme.id)}>
                    <IconExport className="w-4 h-4" />
                    Export
                  </Button>
                  <Button variant="secondary" size="md" className="inline-flex items-center gap-1.5 ml-auto" onClick={() => handleDuplicate(currentTheme.id)}>
                    <IconDuplicate className="w-4 h-4" />
                    Duplicate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------
         * Theme library â€” WordPress-style browsable grid. Hover a theme to
         * reveal Activate / Preview, exactly like wp-admin > Appearance.
         * ------------------------------------------------------------- */}
        <div className="w-full mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Theme library</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {libraryThemes.length} theme{libraryThemes.length === 1 ? "" : "s"} available to activate
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchBar
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search themes..."
                ariaLabel="Search themes"
                className="w-full sm:max-w-sm"
                inputClassName="pl-10"
                leftIcon={
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-gray-500 dark:text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                }
                onSearch={() => {}}
              />
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-100 dark:bg-gray-700">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode("grid")}
                >
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode("list")}
                >
                  <svg
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden animate-pulse">
                  <div className="h-36 bg-gray-100 dark:bg-gray-700" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-700" />
                    <div className="h-2.5 w-full rounded bg-gray-100 dark:bg-gray-700" />
                    <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : libraryThemes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
              {searchValue.trim() ? (
                <>No themes match &quot;{searchValue}&quot;.</>
              ) : (
                <>No other themes available. Create one to get started.</>
              )}
            </div>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-3"
              }
            >
              {libraryThemes.map((theme) =>
                viewMode === "grid" ? (
                   <div
                     key={theme.id}
                     className={"group relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5" + (openMenuId === theme.id ? " z-50" : "")}
                   >
                      <div className="relative overflow-hidden rounded-t-lg">
                        <div className="transition-transform duration-300 group-hover:scale-[1.03]">
                          <ThemePreview colors={theme.colors} />
                        </div>
                        {theme.isDraft && (
                          <span className="absolute top-2 left-2 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5 dark:bg-amber-900/60 dark:text-amber-300">
                            Draft
                          </span>
                        )}
                       {/* WordPress-style hover overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="primary" size="sm" onClick={() => activateTheme(theme.id)}>
                            Activate
                          </Button>
                        </div>
                     </div>
                    <div className="p-3 flex items-end justify-between gap-2">
                       <div className="min-w-0">
                         <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{theme.title}</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                           {theme.description}
                         </p>
                         <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">{theme.font}</p>
                       </div>
                       <div className="relative shrink-0">
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Theme actions" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === theme.id ? null : theme.id); }}>
                           <IconDots className="w-4 h-4" />
                         </Button>
                         {openMenuId === theme.id && (
                             <div className="theme-action-menu absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[170px]">
                              <Button onClick={() => { activateTheme(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                                <IconEye className="w-3.5 h-3.5" /> Activate
                              </Button>
                              <Button onClick={() => { handlePreview(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                                <IconEye className="w-3.5 h-3.5" /> Preview
                              </Button>
                              <Button onClick={() => { openRenameModal(theme); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                                <IconRename className="w-3.5 h-3.5" /> Rename
                              </Button>
                              <Button onClick={() => { handleDuplicate(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                                <IconDuplicate className="w-3.5 h-3.5" /> Duplicate
                              </Button>
                              <Button onClick={() => { handleExport(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                                <IconExport className="w-3.5 h-3.5" /> Export
                              </Button>
                              <Button onClick={() => { openDeleteModal(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <IconTrash className="w-3.5 h-3.5" /> Delete
                              </Button>
                            </div>
                         )}
                       </div>
                     </div>
                  </div>
                ) : (
                   <div
                     key={theme.id}
                     className={"flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 transition-shadow hover:shadow-sm" + (openMenuId === theme.id ? " z-50 relative" : "")}
                   >
                    <div className="relative w-28 shrink-0">
                      <ThemePreview colors={theme.colors} />
                      {theme.isDraft && (
                        <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 dark:bg-amber-900/60 dark:text-amber-300">
                          Draft
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex items-end justify-between gap-2">
                       <div className="min-w-0">
                         <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{theme.title}</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                           {theme.description}
                         </p>
                         <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{theme.font}</p>
                       </div>
                       <div className="relative shrink-0">
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Theme actions" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === theme.id ? null : theme.id); }}>
                           <IconDots className="w-4 h-4" />
                         </Button>
                         {openMenuId === theme.id && (
                           <div className="theme-action-menu absolute top-full mt-1 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[170px]">
                             <Button onClick={() => { activateTheme(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                               <IconEye className="w-3.5 h-3.5" /> Preview
                             </Button>
                             <Button onClick={() => { openRenameModal(theme); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                               <IconRename className="w-3.5 h-3.5" /> Rename
                             </Button>
                             <Button onClick={() => { handleDuplicate(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                               <IconDuplicate className="w-3.5 h-3.5" /> Duplicate
                             </Button>
                             <Button onClick={() => { handleExport(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:bg-gray-700 flex items-center gap-2">
                               <IconExport className="w-3.5 h-3.5" /> Export
                             </Button>
                             <Button onClick={() => { openDeleteModal(theme.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                               <IconTrash className="w-3.5 h-3.5" /> Delete
                             </Button>
                           </div>
                         )}
                       </div>
                     </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€â”€ Full-screen GrapesJS Editor Popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {editorThemeId !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            background: "#1e1e1e",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              height: 48,
              background: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              flexShrink: 0,
              borderBottom: "1px solid #333",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
              Visual Theme Editor
              {currentTheme && (
                <span style={{ color: "#888", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                  â€” {currentTheme.title}
                </span>
              )}
            </span>
            <Button
              onClick={() => setEditorThemeId(null)}
              style={{
                background: "transparent",
                border: "1px solid #444",
                borderRadius: 6,
                color: "#ccc",
                cursor: "pointer",
                padding: "4px 12px",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              âœ• Close
            </Button>
          </div>

          {/* GrapesJS fills the rest */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <GjsEditorShell storeId={resolvedStoreId} themeId={editorThemeId} />
          </div>
        </div>
      )}

      {/* â”€â”€â”€ Level 1 â€” Appearance (ThemeSettings only, never the canvas) â”€â”€â”€â”€ */}

      {appearanceThemeId !== null && (
        <EditorProvider storeId={resolvedStoreId} themeId={appearanceThemeId}>
          <HiddenCanvasHost />
          <ThemeSettingsPanel onClose={() => setAppearanceThemeId(null)} />
        </EditorProvider>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete theme"
        description="This will permanently delete this theme and all its associated pages and sections. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />

      {catalogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setCatalogOpen(false)}>
          <div
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">Theme catalog</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Themes marked "Locked" require a plan upgrade.
                </p>
              </div>
              <Button onClick={() => setCatalogOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">
                &times;
              </Button>
            </div>
            <div className="p-6 overflow-y-auto">
              {catalogLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading catalog...</p>
              ) : catalogThemes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No catalog themes available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {catalogThemes.map((ct) => (
                    <div
                      key={ct.id}
                      className={`relative rounded-lg border overflow-hidden ${
                        ct.locked
                          ? "border-gray-200 dark:border-gray-700 opacity-60"
                          : "border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer"
                      }`}
                      onClick={() => !ct.locked && applyCatalogTheme(ct)}
                    >
                      <ThemePreview
                        colors={[
                          ct.colors?.primary || "#000",
                          ct.colors?.secondary || "#ccc",
                          ct.colors?.accent || "#000",
                          "#ef4444",
                          ct.colors?.background || "#fff",
                        ]}
                      />
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ct.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ct.description}</p>
                        </div>
                        {ct.locked ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium px-2 py-0.5">
                            ðŸ”’ Locked

                          </span>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={applyingCatalogId === ct.id}
                            onClick={(e) => { e.stopPropagation(); applyCatalogTheme(ct); }}
                          >
                            {applyingCatalogId === ct.id ? "Applying..." : "Use"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {renameModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={cancelRename}>
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Rename theme</h3>
            <input
              type="text"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') cancelRename(); }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md mb-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Theme name"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={cancelRename}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={confirmRename} disabled={!newThemeName.trim()}>
                Rename
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Themes;