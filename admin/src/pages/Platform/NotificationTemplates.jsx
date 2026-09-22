import { Badge, Card, CardBody, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import { notifyError, notifySuccess } from "@/utils/toast";
import NotificationTemplateService from "@/services/notificationTemplateService";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const LOCALES = ["fr", "en", "ar"];
const CHANNELS = ["in_app", "email", "push"];

const emptyDraft = () => ({
  enabled: true,
  channels: { in_app: true, email: false, push: false },
  title: { fr: "", en: "", ar: "" },
  message: { fr: "", en: "", ar: "" },
});

const NotificationTemplates = () => {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await NotificationTemplateService.getAllTemplates();
      setTemplates(res?.templates || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))].sort();
  const filteredTemplates =
    categoryFilter === "all" ? templates : templates.filter((t) => t.category === categoryFilter);
  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleTemplates = filteredTemplates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const draftHasContent = (value) =>
    ["fr", "en", "ar"].some((locale) => (value?.[locale] || "").trim().length > 0);
  const canSaveDraft = draftHasContent(draft.title) && draftHasContent(draft.message);

  const startEdit = (template) => {
    setEditingId(template._id);
    setDraft({
      enabled: template.enabled,
      channels: { ...template.channels },
      title: { ...template.title },
      message: { ...template.message },
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      await NotificationTemplateService.updateTemplate(id, draft);
      notifySuccess("Template mis Ã  jour");

      cancelEdit();
      loadTemplates();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (template) => {
    try {
      await NotificationTemplateService.updateTemplate(template._id, { enabled: !template.enabled });
      loadTemplates();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  if (loading) {
    return (
      <>
        <PageTitle>{t("Notification Templates")}</PageTitle>
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle>{t("Notification Templates")}</PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("Category")}:</span>
        <Button size="small" layout={categoryFilter === "all" ? undefined : "outline"} className={`w-auto rounded-xl ${categoryFilter === "all" ? "" : "text-gray-600 dark:text-gray-300"}`} onClick={() => { setCategoryFilter("all"); setPage(1); }}>
          {t("All")} ({templates.length})
        </Button>
        {categories.map((category) => (
          <Button key={category} size="small" layout={categoryFilter === category ? undefined : "outline"} className={`w-auto rounded-xl ${categoryFilter === category ? "" : "text-gray-600 dark:text-gray-300"}`} onClick={() => { setCategoryFilter(category); setPage(1); }}>
            {category} ({templates.filter((t) => t.category === category).length})
          </Button>
        ))}
      </div>

      <Card className="shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("Code")}</TableCell>
                  <TableCell>{t("Name")}</TableCell>
                  <TableCell>{t("Category")}</TableCell>
                  <TableCell>{t("Channels")}</TableCell>
                  <TableCell>{t("Enabled")}</TableCell>
                  <TableCell>{t("Action")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {visibleTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      {t("NoTemplatesForCategory")}
                    </TableCell>
                  </TableRow>
                ) : (
                visibleTemplates.map((t) => (
                  <Fragment key={t._id}>
                    <TableRow>
                      <TableCell className="font-mono text-xs font-medium text-gray-600 dark:text-gray-300">
                        {t.code}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 dark:text-gray-200">
                        {t.name || "â€”"}

                      </TableCell>
                      <TableCell>
                        <Badge type="success">{t.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {CHANNELS.filter((c) => t.channels?.[c]).join(", ") || "â€”"}

                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          layout={t.enabled ? "primary" : "outline"}
                          onClick={() => toggleEnabled(t)}
                          className="w-auto text-xs"
                        >
                          {t.enabled ? "Enabled" : "Disabled"}
                        </Button>

                      </TableCell>

                      <TableCell>
                        <Button
                          size="small"
                          className="w-auto"
                          onClick={() => startEdit(t)}
                        >
                          {t("Edit")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {filteredTemplates.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>
            Page {safePage} of {totalPages} Â· {filteredTemplates.length} templates

          </span>
          <div className="flex gap-2">
            <Button size="small" layout="outline" className="w-auto rounded-xl" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
              {t("Previous")}
            </Button>
            <Button size="small" layout="outline" className="w-auto rounded-xl" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}>
              {t("Next")}
            </Button>
          </div>
        </div>
      )}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${editingId ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={cancelEdit}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-800 ${editingId ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("EditTemplate")}</h3>
            <p className="truncate font-mono text-xs text-emerald-600 dark:text-emerald-400">
              {templates.find((t) => t._id === editingId)?.code || ""}
            </p>
          </div>
          <IconButton
            icon="close"
            onClick={cancelEdit}
            aria-label="Close drawer"
          />


        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Channels")}</label>
            <div className="flex gap-4">
              {CHANNELS.map((channel) => (
                <label key={channel} className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={!!draft.channels?.[channel]}
                    onChange={() =>
                      setDraft((d) => ({
                        ...d,
                        channels: { ...d.channels, [channel]: !d.channels?.[channel] },
                      }))
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {channel}
                </label>
              ))}
            </div>
          </div>

          {LOCALES.map((locale) => (
            <div key={locale} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{locale}</span>
                <span className="text-[10px] text-gray-400">{locale === "ar" ? "RTL" : "LTR"}</span>
              </div>
              <input
                type="text"
                dir={locale === "ar" ? "rtl" : "ltr"}
                placeholder="Titleâ€¦"

                value={draft.title?.[locale] || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: { ...d.title, [locale]: e.target.value } }))
                }
                className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <textarea
                rows={2}
                dir={locale === "ar" ? "rtl" : "ltr"}
                placeholder={"Messageâ€¦ (variables {{var}})"}

                value={draft.message?.[locale] || ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, message: { ...d.message, [locale]: e.target.value } }))
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          ))}
        </div>

        <footer className="border-t border-gray-200 p-4 dark:border-gray-700">
          {!canSaveDraft && (
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">
              {t("TemplateContentRequired")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button layout="outline" size="small" onClick={cancelEdit} disabled={saving}>{t("Cancel")}</Button>
            <Button size="small" disabled={saving || !canSaveDraft} onClick={() => handleSave(editingId)} className="w-auto bg-emerald-500 text-white">
              {saving ? t("Saving") : t("SaveChanges")}
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
};

export default NotificationTemplates;
