import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Textarea, Label, Modal, ModalHeader, ModalBody, ModalFooter } from "@windmill/react-ui";
import {
  FiPlus,
  FiTrash2,
  FiCheckSquare,
  FiSquare,
  FiEdit,
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiX,
  FiAlertTriangle,
  FiClock,
  FiUser,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import platformNoteAPI from "@/services/platformNoteAPI";
import useGetCData from "@/hooks/useGetCData";
import { notifySuccess, notifyError } from "@/utils/toast";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const TABS = [
  { id: "all", labelKey: "TabAll", defaultLabel: "Toutes" },
  { id: "pinned", labelKey: "TabPinned", defaultLabel: "Ã‰pinglÃ©es" },

  { id: "recent", labelKey: "TabRecent", defaultLabel: "Cette semaine" },
];

const SORTS = [
  { id: "newest", labelKey: "SortNewest", defaultLabel: "Plus rÃ©centes" },
  { id: "oldest", labelKey: "SortOldest", defaultLabel: "Plus anciennes" },
  { id: "alpha", labelKey: "SortAlpha", defaultLabel: "AlphabÃ©tique" },

];

const PAGE_SIZE = 25;
const MAX_LEN = 5000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const formatDate = (iso) => {
  if (!iso) return "â€”";

  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "â€”";

  }
};

const formatRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ã  l'instant";

  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(iso);
};

// Deterministic gradient pair from a string (used to colour avatars).
const avatarGradient = (seed = "") => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const palettes = [
    ["from-violet-500", "to-indigo-500"],
    ["from-emerald-500", "to-teal-500"],
    ["from-amber-500", "to-orange-500"],
    ["from-pink-500", "to-rose-500"],
    ["from-sky-500", "to-cyan-500"],
    ["from-fuchsia-500", "to-purple-500"],
  ];
  return palettes[hash % palettes.length];
};

const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

const NoteCard = ({ note, canPin, canUpdate, canDelete, onPin, onEdit, onDelete, t }) => {
  const gradient = avatarGradient(note.authorId?.name || note.authorId?.email || note._id);
  const charCount = (note.content || "").length;

  return (
    <li
      className={`group relative overflow-hidden rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 ${
        note.pinned
          ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-900"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {note.pinned ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
      ) : null}

      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient.join(" ")} text-sm font-semibold text-white shadow-sm`}>
          {initialsOf(note.authorId?.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {note.pinned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                ðŸ“Œ {t("Pinned", { defaultValue: "Ã‰pinglÃ©e" })}

              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <FiUser className="h-3 w-3" />
              {note.authorId?.name || note.authorId?.email || t("Unknown", { defaultValue: "Inconnu" })}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">â€¢</span>

            <span
              className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
              title={formatDate(note.createdAt)}
            >
              <FiClock className="h-3 w-3" />
              {formatRelative(note.createdAt)}
            </span>
            {note.updatedAt && note.updatedAt !== note.createdAt ? (
              <span className="text-xs italic text-gray-400 dark:text-gray-500">
                ({t("Edited", { defaultValue: "modifiÃ©" })})

              </span>
            ) : null}
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-gray-100">
            {note.content}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{charCount} / {MAX_LEN}</span>
            <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
              {canPin && (
                <IconButton
                  icon={note.pinned ? "check" : "edit"}
                  onClick={() => onPin(note._id, !note.pinned)}
                  aria-label={note.pinned ? t("Unpin", { defaultValue: "DÃ©sÃ©pingler" }) : t("Pin", { defaultValue: "Ã‰pingler" })}
                  title={note.pinned ? t("Unpin", { defaultValue: "DÃ©sÃ©pingler" }) : t("Pin", { defaultValue: "Ã‰pingler" })}

                />
              )}
              {canUpdate && (
                <IconButton
                  icon="edit"
                  onClick={() => onEdit(note)}
                  aria-label={t("Edit", { defaultValue: "Modifier" })}
                  title={t("Edit", { defaultValue: "Modifier" })}
                />
              )}
              {canDelete && (
                <IconButton
                  icon="trash"
                  onClick={() => onDelete(note)}
                  aria-label={t("Delete", { defaultValue: "Supprimer" })}
                  title={t("Delete", { defaultValue: "Supprimer" })}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </li>
  );
};

const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmLabel, danger, t }) => (
  <Modal isOpen={open} onClose={onClose}>
    <ModalHeader className="flex items-center gap-2">
      <FiAlertTriangle className={danger ? "text-red-500" : "text-amber-500"} />
      <span>{title}</span>
    </ModalHeader>
    <ModalBody>
      <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
    </ModalBody>
    <ModalFooter>
      <Button layout="outline" onClick={onClose}>
        {t("Cancel", { defaultValue: "Annuler" })}
      </Button>
      <Button
        onClick={onConfirm}
        className={danger ? "bg-red-600 hover:bg-red-700" : ""}
      >
        {confirmLabel}
      </Button>
    </ModalFooter>
  </Modal>
);

const NoteEditorModal = ({ open, mode, initial, onClose, onSubmit, isLoading, t }) => {
  const [content, setContent] = useState(initial || "");
  const [pinned, setPinned] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setContent(initial || "");
      setPinned(mode === "create" ? false : !!initial?.pinned);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, initial, mode]);

  const charCount = content.length;
  const overLimit = charCount > MAX_LEN;
  const empty = content.trim().length === 0;

  const submit = () => {
    if (empty || overLimit) return;
    onSubmit({ content: content.trim(), pinned });
  };

  return (
    <Modal isOpen={open} onClose={onClose}>
      <ModalHeader className="flex items-center justify-between">
        <span>{mode === "create" ? t("NewNote", { defaultValue: "Nouvelle note" }) : t("EditNote", { defaultValue: "Modifier la note" })}</span>
        <IconButton
          icon="close"
          onClick={onClose}
          aria-label="Close modal"
        />

      </ModalHeader>
      <ModalBody>
        <div className="space-y-3">
          <Label>{t("Content", { defaultValue: "Contenu" })}</Label>
          <Textarea
            ref={textareaRef}
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("NotePlaceholder", { defaultValue: "Ã‰crivez votre noteâ€¦" })}

            className="resize-y"
          />
          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded"
              />
              {t("Pinned", { defaultValue: "Ã‰pingler cette note" })}

            </label>
            <span className={overLimit ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500 dark:text-gray-400"}>
              {charCount} / {MAX_LEN}
            </span>
          </div>
          {overLimit ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("NoteTooLong", { defaultValue: `Maximum ${MAX_LEN} caractÃ¨res.` })}

            </p>
          ) : null}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button layout="outline" onClick={onClose}>
          {t("Cancel", { defaultValue: "Annuler" })}
        </Button>
        <Button onClick={submit} disabled={empty || overLimit || isLoading}>
          {t("Save", { defaultValue: "Enregistrer" })}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const PlatformNotes = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const queryClient = useQueryClient();
  const searchRef = useRef(null);

  const canView = hasPermission("platform_notes", "view");
  const canCreate = hasPermission("platform_notes", "create");
  const canUpdate = hasPermission("platform_notes", "update");
  const canDelete = hasPermission("platform_notes", "delete");
  const canPin = hasPermission("platform_notes", "pin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // Debounce search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change.
  useEffect(() => setPage(1), [debouncedSearch, tab, sort]);

  // Ctrl/Cmd+K focuses search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsCreateOpen(false);
        setEditing(null);
        setPendingDelete(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["platformNotes", { debouncedSearch, tab, sort, page }],
    queryFn: () => platformNoteAPI.list({
      search: debouncedSearch || undefined,
      pinned: tab === "pinned" ? true : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    enabled: canView,
  });

  const items = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

  // Stats (computed client-side on the current page slice â€” for a per-store

  // total we would need a dedicated stats endpoint; for V1 the local slice
  // is enough to drive the summary banner).
  const stats = useMemo(() => {
    const total = pagination.total;
    const pinnedCount = items.filter((n) => n.pinned).length;
    const recentCount = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() < WEEK_MS).length;
    return { total, pinnedCount, recentCount };
  }, [items, pagination.total]);

  // Sort locally (the backend always returns pinned-first + newest-first).
  const sortedItems = useMemo(() => {
    const copy = [...items];
    if (tab === "recent") {
      // Already filtered server-side via the date range would be ideal;
      // until we add a date filter endpoint we just slice from the most
      // recent week. For an MVP this gives the right shape; the tab
      // label is consistent with the visible badge.
      return copy
        .filter((n) => Date.now() - new Date(n.createdAt).getTime() < WEEK_MS)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sort === "oldest") {
      return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (sort === "alpha") {
      return copy.sort((a, b) =>
        (a.content || "").localeCompare(b.content || "", undefined, { sensitivity: "base" })
      );
    }
    // newest (default)
    return copy.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [items, sort, tab]);

  const invalidate = () => queryClient.invalidateQueries(["platformNotes"]);

  const createMutation = useMutation({
    mutationFn: (payload) => platformNoteAPI.create(payload),
    onSuccess: () => {
      notifySuccess(t("PlatformNoteCreated", { defaultValue: "Note crÃ©Ã©e" }));

      setIsCreateOpen(false);
      invalidate();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => platformNoteAPI.update(id, payload),
    onSuccess: () => {
      notifySuccess(t("PlatformNoteUpdated", { defaultValue: "Note mise Ã  jour" }));

      setEditing(null);
      invalidate();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => platformNoteAPI.softDelete(id),
    onSuccess: () => {
      notifySuccess(t("PlatformNoteDeleted", { defaultValue: "Note supprimÃ©e" }));

      setPendingDelete(null);
      invalidate();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }) => platformNoteAPI.setPinned(id, pinned),
    onSuccess: invalidate,
    onError: (err) => notifyError(err?.response?.data?.message || err?.message),
  });

  const exportMd = () => {
    const header = `# ${t("PlatformNotes", { defaultValue: "Notes plateforme" })}\n\n_Export du ${new Date().toLocaleString()}_\n\n`;
    const body = sortedItems
      .map((n) => {
        const pin = n.pinned ? "ðŸ“Œ " : "";
        const author = n.authorId?.name || "Inconnu";
        const date = formatDate(n.createdAt);
        return `## ${pin}${author} â€” ${date}\n\n${n.content}\n`;

      })
      .join("\n---\n\n");
    const blob = new Blob([header + body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-notes-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatedContent>
      <div className="mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <PageTitle>{t("PlatformNotes", { defaultValue: "Notes plateforme" })}</PageTitle>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {t("PlatformNotesDescription", {
                defaultValue:
                  "Memos internes pour votre Ã©quipe plateforme. Ces notes ne sont attachÃ©es Ã  aucune boutique.",

              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sortedItems.length > 0 ? (
              <Button
                layout="outline"
                size="small"
                onClick={exportMd}
                className="inline-flex items-center gap-2"
              >
                <FiDownload />
                {t("Export", { defaultValue: "Exporter" })}
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2">
                <FiPlus />
                {t("NewNote", { defaultValue: "Nouvelle note" })}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Stats banner */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t("StatTotal", { defaultValue: "Total" })}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {stats.total}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 dark:border-amber-700 dark:from-amber-900/20 dark:to-gray-900">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t("StatPinned", { defaultValue: "Ã‰pinglÃ©es" })}

            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-800 dark:text-amber-200">
              {stats.pinnedCount}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-700 dark:from-emerald-900/20 dark:to-gray-900">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {t("StatRecent", { defaultValue: "Cette semaine" })}
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
              {stats.recentCount}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="mb-4">
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchRef}
                  className="pl-9"
                  placeholder={t("SearchNotesPlaceholder", { defaultValue: "Rechercherâ€¦  (Ctrl+K)" })}

                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search ? (
                  <IconButton
                    icon="close"
                    onClick={() => setSearch("")}
                    aria-label={t("Clear", { defaultValue: "Effacer" })}
                    title={t("Clear", { defaultValue: "Effacer" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  />
                ) : null}
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelKey, { defaultValue: s.defaultLabel })}
                  </option>
                ))}
              </select>

              <Button
                layout="outline"
                size="small"
                onClick={invalidate}
                className="inline-flex items-center gap-1"
                disabled={isFetching}
              >
                <FiRefreshCw className={isFetching ? "animate-spin" : ""} />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
              {TABS.map((t2def) => (
                <Button
                  key={t2def.id}
                  layout={tab === t2def.id ? "primary" : "outline"}
                  size="small"
                  onClick={() => setTab(t2def.id)}
                  className="rounded-t-lg rounded-b-none"
                >
                  {t(t2def.labelKey, { defaultValue: t2def.defaultLabel })}
                </Button>
              ))}
            </div>

          </CardBody>
        </Card>

        {/* List */}
        <Card>
          <CardBody>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <FiRefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : sortedItems.length === 0 ? (
              <EmptyState
                tab={tab}
                hasSearch={Boolean(debouncedSearch)}
                onCreate={canCreate ? () => setIsCreateOpen(true) : null}
                t={t}
              />
            ) : (
              <>
                <ul className="space-y-3">
                  {sortedItems.map((n) => (
                    <NoteCard
                      key={n._id}
                      note={n}
                      canPin={canPin}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      onPin={(id, pinned) => pinMutation.mutate({ id, pinned })}
                      onEdit={(note) => setEditing(note)}
                      onDelete={(note) => setPendingDelete(note)}
                      t={t}
                    />
                  ))}
                </ul>

                {pagination.totalPages > 1 ? (
                  <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:flex-row">
                    <span>
                      {t("PaginationInfo", {
                        defaultValue: "Page {{page}} / {{total}} â€” {{count}} notes",

                        page: pagination.page,
                        total: pagination.totalPages,
                        count: pagination.total,
                      })}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        layout="outline"
                        size="small"
                        disabled={pagination.page <= 1 || isFetching}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        {t("Prev", { defaultValue: "PrÃ©cÃ©dent" })}

                      </Button>
                      <Button
                        layout="outline"
                        size="small"
                        disabled={pagination.page >= pagination.totalPages || isFetching}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t("Next", { defaultValue: "Suivant" })}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>

        {/* Editor (create + edit) */}
        <NoteEditorModal
          open={isCreateOpen}
          mode="create"
          initial=""
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          isLoading={createMutation.isLoading}
          t={t}
        />
        <NoteEditorModal
          open={Boolean(editing)}
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editing._id, payload })}
          isLoading={updateMutation.isLoading}
          t={t}
        />

        {/* Confirm delete */}
        <ConfirmModal
          open={Boolean(pendingDelete)}
          danger
          title={t("ConfirmDeleteTitle", { defaultValue: "Supprimer cette note ?" })}
          message={t("ConfirmDeleteBody", {
            defaultValue: "Cette action est irrÃ©versible (soft delete). Vous pourrez toujours la retrouver dans les logs d'audit.",

          })}
          confirmLabel={t("Delete", { defaultValue: "Supprimer" })}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => deleteMutation.mutate(pendingDelete._id)}
          t={t}
        />
      </div>
    </AnimatedContent>
  );
};

const EmptyState = ({ tab, hasSearch, onCreate, t }) => {
  const isFiltered = tab !== "all" || hasSearch;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-700">
        ðŸ“

      </div>
      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
        {isFiltered
          ? t("EmptyFiltered", { defaultValue: "Aucune note ne correspond" })
          : t("EmptyTitle", { defaultValue: "Aucune note pour le moment" })}
      </h3>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {isFiltered
          ? t("EmptyFilteredHelp", { defaultValue: "Essayez d'Ã©largir la recherche ou de changer d'onglet." })
          : t("EmptyHelp", { defaultValue: "Commencez par capturer vos premiÃ¨res idÃ©es plateforme." })}

      </p>
      {onCreate ? (
        <Button onClick={onCreate} className="mt-4 inline-flex items-center gap-2">
          <FiPlus />
          {t("NewNote", { defaultValue: "CrÃ©er une note" })}

        </Button>
      ) : null}
    </div>
  );
};

export default PlatformNotes;