import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import Button from "@/components/ui/CButton";
import ConfirmModal from "@/components/modals/CConfirmModal";
import PageTitle from "@/components/Typography/PageTitle";
import { notifySuccess, notifyError } from "@/utils/toast";
import ThemeEditorServices from "@/services/ThemeEditorServices";
import { FiFileText } from "react-icons/fi";
import { Button } from "@sofia/ui";

/* -------------------------------------------------------------------------
 * StorePages â€” THEME-02 "Level 1" Pages screen.
 * Activate/deactivate, reorder, and edit title/SEO only â€” never opens the

 * GrapesJS canvas. Content editing beyond that is Level 2 territory,
 * gated server-side by the "builder" Plan feature (see pageController.js /
 * updatePage) regardless of what this screen offers.
 * ---------------------------------------------------------------------- */

const IconChevronUp = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const IconChevronDown = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconSeo = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconTrash = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const StorePages = () => {
  const { t } = useTranslation();
  // i18next returns the key itself (never undefined) when a translation is
  // missing, so `t(key) || fallback` never actually falls back â€” the raw

  // key ("PagesLevel1Description") was rendering straight to the page.
  // This detects that "echoed the key back" case explicitly.
  const tr = (key, fallback) => {
    const value = t(key);
    return !value || value === key ? fallback : value;
  };
  const [storeId, setStoreId] = useState(Cookies.get("company") || null);
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [seoModalPage, setSeoModalPage] = useState(null);
  const [seoForm, setSeoForm] = useState({ title: "", metaDescription: "", metaKeywords: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadPages = async () => {
    if (!storeId) return;
    try {
      setIsLoading(true);
      const list = await ThemeEditorServices.getStorePages(storeId);
      const sorted = [...(Array.isArray(list) ? list : [])].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      );
      setPages(sorted);
    } catch (err) {
      console.error("Failed to load pages", err);
      notifyError(err?.response?.data?.message || "Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const togglePublished = async (page) => {
    try {
      setSavingId(page._id);
      await ThemeEditorServices.updatePageSettings(page._id, { isPublished: !page.isPublished });
      setPages((prev) =>
        prev.map((p) => (p._id === page._id ? { ...p, isPublished: !p.isPublished } : p))
      );
      notifySuccess(page.isPublished ? "Page deactivated" : "Page activated");
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to update page");
    } finally {
      setSavingId(null);
    }
  };

  const movePage = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const reordered = [...pages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setPages(reordered);

    try {
      await Promise.all(
        reordered.map((p, i) =>
          p.displayOrder === i ? null : ThemeEditorServices.updatePageSettings(p._id, { displayOrder: i })
        )
      );
      setPages((prev) => prev.map((p, i) => ({ ...p, displayOrder: i })));
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to reorder pages");
      loadPages();
    }
  };

  const openSeoModal = (page) => {
    setSeoModalPage(page);
    setSeoForm({
      title: page.title || "",
      metaDescription: page.metaDescription || "",
      metaKeywords: page.metaKeywords || "",
    });
  };

  const saveSeo = async () => {
    if (!seoModalPage) return;
    try {
      setSavingId(seoModalPage._id);
      await ThemeEditorServices.updatePageSettings(seoModalPage._id, seoForm);
      setPages((prev) =>
        prev.map((p) => (p._id === seoModalPage._id ? { ...p, ...seoForm } : p))
      );
      notifySuccess("Page updated");
      setSeoModalPage(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to update page");
    } finally {
      setSavingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await ThemeEditorServices.deletePage(deleteTarget._id);
      notifySuccess("Page deleted");
      setPages((prev) => prev.filter((p) => p._id !== deleteTarget._id));
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to delete page");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <main className="flex flex-1 flex-col sm:px-4 bg-gray-50 dark:bg-gray-900 peer-[.header-fixed]/header:mt-16">
      <div className="w-full min-h-full flex-1 pt-2 pb-8 px-4 sm:px-6 lg:px-8">
        <PageTitle>{tr("Pages", "Pages")}</PageTitle>
        <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
          {tr(
            "PagesLevel1Description",
            "Activate, reorder, and edit the SEO of your store pages. For full layout editing, use Themes â†’ Customize."

          )}
        </p>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
              ))}
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
              <FiFileText className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tr("NoPagesFound", "No pages found for this store.")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 w-20">
                      {tr("Order", "Order")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {tr("Page", "Page")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {tr("Status", "Status")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {tr("Actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pages.map((page, index) => {
                    const slug = (page.urlSlug || page.slug || "").replace(/^\/+/, "");
                    return (
                      <tr key={page._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <Button
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                              onClick={() => movePage(index, -1)}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              <IconChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                              onClick={() => movePage(index, 1)}
                              disabled={index === pages.length - 1}
                              aria-label="Move down"
                            >
                              <IconChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              <FiFileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {page.title || page.name}
                                </p>
                                {page.isHome && (
                                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium px-2 py-0.5">
                                    {tr("Home", "Home")}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500">
                                /{slug || (page.isHome ? "" : page._id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            onClick={() => togglePublished(page)}
                            disabled={savingId === page._id}
                            className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-1 transition disabled:opacity-60 ${
                              page.isPublished
                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${page.isPublished ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {page.isPublished ? tr("Active", "Active") : tr("Inactive", "Inactive")}
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" className="inline-flex items-center gap-1.5" onClick={() => openSeoModal(page)}>
                              <IconSeo className="w-3.5 h-3.5" />
                              {tr("EditSeo", "Edit SEO")}
                            </Button>
                            {!page.isHome && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => setDeleteTarget(page)}
                                aria-label="Delete page"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {seoModalPage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setSeoModalPage(null)}>
          <div
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Edit page â€” {seoModalPage.title}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={seoForm.title}
                  onChange={(e) => setSeoForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meta description</label>
                <textarea
                  rows={3}
                  value={seoForm.metaDescription}
                  onChange={(e) => setSeoForm((f) => ({ ...f, metaDescription: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Meta keywords</label>
                <input
                  type="text"
                  value={seoForm.metaKeywords}
                  onChange={(e) => setSeoForm((f) => ({ ...f, metaKeywords: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSeoModalPage(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={saveSeo} disabled={savingId === seoModalPage._id}>
                {savingId === seoModalPage._id ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete page"
        description="This will permanently delete this page. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
      />
    </main>
  );
};

export default StorePages;
