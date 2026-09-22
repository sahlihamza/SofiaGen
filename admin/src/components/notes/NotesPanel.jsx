import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import {
  FiPlus,
  FiTrash2,
  FiEdit3,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiLoader,
  FiPin,
  FiLock,
  FiSearch,
  FiMessageSquare,
  FiChevronDown,
} from "react-icons/fi";
import {
import { Button } from "@sofia/ui";

  listNotes,
  createNote,
  updateNote,
  deleteNote,
  pinNote,
} from "@/services/notesService";


/**
 * NotesPanel
 * -----------
 * Reusable internal-notes widget for the back-office.
 *
 * Mount anywhere a resource is detailed (order, customer, product, ticket,
 * shipment, invoice, store). The component:
 *
 *   1. Reads/writes through the polymorphic /api/notes endpoint
 *   2. Paginates server-side (default 20/page)
 *   3. Hides the "+ Add" button if the user lacks notes.create
 *   4. Hides edit/delete if the user lacks the matching permission
 *   5. Disables pin if the user lacks notes.pin
 *   6. Soft-handles the offline / 4xx / 5xx / 403 cases
 *   7. NEVER lets the user forge authorId / storeId â€” those are derived

 *      from the auth context server-side.
 *
 * Usage:
 *   <NotesPanel entityType="order" entityId={order._id} />
 *
 * Props:
 *   entityType        - one of "order"|"customer"|"product"|"ticket"|"shipment"|"invoice"|"store"
 *   entityId          - string (24-hex) or ObjectId-like string
 *   permissions       - { view, create, update, delete, pin } booleans
 *                       (defaults to all true; the server is the source of truth
 *                        and will 403 anything the user can't do)
 *   pageSize          - integer (default 20)
 *   onChange          - callback fired whenever the dataset changes
 *                       ({ type: "create"|"update"|"delete"|"pin", note })
 *   readonly          - if true, hides all action buttons
 *   maxHeight         - CSS value for the scroll area (default "60vh")
 *   emptyState        - ReactNode overriding the default empty state
 *   className         - extra classes for the outer container
 */
const NotesPanel = ({
  entityType,
  entityId,
  permissions = {
    view: true,
    create: true,
    update: true,
    delete: true,
    pin: true,
  },
  pageSize = 20,
  onChange,
  readonly = false,
  maxHeight = "60vh",
  emptyState,
  className = "",
}) => {
  const { t, i18n } = useTranslation();

  // ---- state --------------------------------------------------------------
  const [notes, setNotes] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionInFlight, setActionInFlight] = useState(null); // "create" | id | null

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ---- fetch --------------------------------------------------------------
  const fetchPage = useCallback(
    async (page = 1) => {
      if (!entityType || !entityId) return;
      try {
        setLoading(true);
        setError(null);
        const result = await listNotes({
          entityType,
          entityId,
          page,
          limit: pageSize,
          search: search || undefined,
        });
        if (!isMounted.current) return;
        setNotes(result?.data || []);
        setPagination(
          result?.pagination || { page: 1, limit: pageSize, total: 0, totalPages: 1 }
        );
      } catch (err) {
        if (!isMounted.current) return;
        setError(err);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [entityType, entityId, pageSize, search]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // ---- handlers -----------------------------------------------------------
  const handleCreate = useCallback(
    async ({ content, pinned }) => {
      try {
        setActionInFlight("create");
        const created = await createNote({ content, entityType, entityId, pinned });
        await fetchPage(1); // go back to first page so the user sees the new note
        onChange?.({ type: "create", note: created });
      } finally {
        if (isMounted.current) setActionInFlight(null);
      }
    },
    [entityType, entityId, fetchPage, onChange]
  );

  const handleUpdate = useCallback(
    async (id, { content, pinned }) => {
      try {
        setActionInFlight(id);
        const updated = await updateNote(id, { content, pinned });
        setNotes((prev) => prev.map((n) => (n._id === id ? updated : n)));
        onChange?.({ type: "update", note: updated });
        setEditingId(null);
      } finally {
        if (isMounted.current) setActionInFlight(null);
      }
    },
    [onChange]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm(t("notes.confirmDelete"))) return;
      try {
        setActionInFlight(id);
        await deleteNote(id);
        setNotes((prev) => prev.filter((n) => n._id !== id));
        onChange?.({ type: "delete", note: { _id: id } });
      } finally {
        if (isMounted.current) setActionInFlight(null);
      }
    },
    [onChange, t]
  );

  const handlePin = useCallback(
    async (id, currentPinned) => {
      try {
        setActionInFlight(id);
        const updated = await pinNote(id, !currentPinned);
        // Re-fetch to re-order with the new pinned status
        await fetchPage(pagination.page);
        onChange?.({ type: "pin", note: updated });
      } finally {
        if (isMounted.current) setActionInFlight(null);
      }
    },
    [fetchPage, onChange, pagination.page]
  );

  // ---- helpers ------------------------------------------------------------
  const can = useMemo(
    () => ({
      create: !readonly && !!permissions.create,
      update: !readonly && !!permissions.update,
      delete: !readonly && !!permissions.delete,
      pin: !readonly && !!permissions.pin,
    }),
    [readonly, permissions]
  );

  const formatRelative = useCallback(
    (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      const diff = Date.now() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return t("notes.justNow");
      if (minutes < 60) return t("notes.minutesAgo", { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t("notes.hoursAgo", { n: hours });
      const days = Math.floor(hours / 24);
      if (days < 7) return t("notes.daysAgo", { n: days });
      return new Intl.DateTimeFormat(i18n.language, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
    },
    [t, i18n.language]
  );

  // ---- render: states -----------------------------------------------------
  if (!entityType || !entityId) {
    return (
      <Card className={className} title={t("notes.title")}>
        <p className="text-sm text-gray-500">{t("notes.missingTarget")}</p>
      </Card>
    );
  }

  if (error && error.status === 403) {
    return (
      <Card className={className} title={t("notes.title")}>
        <Empty
          icon={<FiLock />}
          title={t("notes.permissionDenied")}
          description={t("notes.permissionDeniedDesc")}
        />
      </Card>
    );
  }

  return (
    <Card
      className={className}
      title={t("notes.title")}
      action={
        can.create && (
          <Button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            <FiPlus className="h-3.5 w-3.5" />
            {t("notes.add")}
          </Button>
        )
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("notes.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div
        className="overflow-y-auto pr-1"
        style={{ maxHeight }}
        role="list"
        aria-label={t("notes.title")}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            <FiLoader className="mr-2 h-4 w-4 animate-spin" />
            {t("notes.loading")}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">{t("notes.error")}</p>
              <p className="text-xs">{error.message || t("notes.errorGeneric")}</p>
            </div>
          </div>
        ) : notes.length === 0 ? (
          emptyState || (
            <Empty
              icon={<FiMessageSquare />}
              title={t("notes.empty")}
              description={t("notes.emptyDesc")}
            />
          )
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => {
              const isEditing = editingId === note._id;
              const isBusy = actionInFlight === note._id;
              const isAuthor =
                note.authorId &&
                (note.authorId._id === note.authorId ||
                  note.authorId.toString?.() === note.authorId) &&
                false; // backend returns authorId populated with { _id, name, email } so we just check it exists

              return (
                <li
                  key={note._id}
                  role="listitem"
                  className={`rounded-lg border p-3 transition-colors ${
                    note.pinned
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {isEditing ? (
                    <EditForm
                      note={note}
                      onCancel={() => setEditingId(null)}
                      onSubmit={(payload) => handleUpdate(note._id, payload)}
                      busy={isBusy}
                      canPin={can.pin}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={note.authorId?.name}
                        email={note.authorId?.email}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">
                            {note.authorId?.name || t("notes.unknownAuthor")}
                          </span>
                          <span>Â·</span>

                          <span title={new Date(note.createdAt).toLocaleString()}>
                            {formatRelative(note.createdAt)}
                          </span>
                          {note.pinned && (
                            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                              <FiPin className="h-2.5 w-2.5" />
                              {t("notes.pinned")}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                          {note.content}
                        </p>
                        {can.pin || can.update || can.delete ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {can.pin && (
                              <Button
                                type="button"
                                onClick={() => handlePin(note._id, note.pinned)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <FiPin className="h-3 w-3" />
                                {note.pinned ? t("notes.unpin") : t("notes.pin")}
                              </Button>
                            )}
                            {can.update && (
                              <Button
                                type="button"
                                onClick={() => setEditingId(note._id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <FiEdit3 className="h-3 w-3" />
                                {t("notes.edit")}
                              </Button>
                            )}
                            {can.delete && (
                              <Button
                                type="button"
                                onClick={() => handleDelete(note._id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <FiTrash2 className="h-3 w-3" />
                                {t("notes.delete")}
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-600">
          <span>
            {t("notes.paginationInfo", {
              page: pagination.page,
              totalPages: pagination.totalPages,
              total: pagination.total,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={() => fetchPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              {t("notes.prev")}
            </Button>
            <Button
              type="button"
              onClick={() => fetchPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
            >
              {t("notes.next")}
            </Button>
          </div>
        </div>
      )}

      {showAddModal && (
        <AddModal
          onCancel={() => setShowAddModal(false)}
          onSubmit={handleCreate}
          busy={actionInFlight === "create"}
          canPin={can.pin}
        />
      )}
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*                                sub-components                              */
/* -------------------------------------------------------------------------- */

const Card = ({ className = "", title, action, children }) => (
  <section
    className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
  >
    <header className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-700">
        <FiMessageSquare className="h-4 w-4 text-blue-600" />
        {title}
      </h3>
      {action}
    </header>
    {children}
  </section>
);

const Empty = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
      {icon}
    </div>
    <p className="text-sm font-semibold text-gray-700">{title}</p>
    {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
  </div>
);

const Avatar = ({ name, email }) => {
  const initials = useMemo(() => {
    if (name) {
      const parts = String(name).trim().split(/\s+/);
      return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
    }
    if (email) return email[0].toUpperCase();
    return "?";
  }, [name, email]);
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700"
      aria-hidden
    >
      {initials}
    </div>
  );
};

const AddModal = ({ onCancel, onSubmit, busy, canPin }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [error, setError] = useState(null);

  const onSubmitForm = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 1) {
      setError(t("notes.contentRequired"));
      return;
    }
    if (trimmed.length > 5000) {
      setError(t("notes.contentTooLong"));
      return;
    }
    setError(null);
    onSubmit({ content: trimmed, pinned: canPin ? pinned : false });
  };

  return (
    <Modal onClose={onCancel} title={t("notes.addTitle")}>
      <form onSubmit={onSubmitForm}>
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={5000}
          placeholder={t("notes.placeholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>
            {t("notes.charCount", { n: content.length })}
          </span>
          {content.length > 5000 && (
            <span className="text-red-600">{t("notes.contentTooLong")}</span>
          )}
        </div>
        {canPin && (
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <FiPin className="h-3.5 w-3.5 text-amber-500" />
            {t("notes.pinThisNote")}
          </label>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiCheck className="h-3.5 w-3.5" />}
            {t("notes.add")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditForm = ({ note, onCancel, onSubmit, busy, canPin }) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(note.content);
  const [pinned, setPinned] = useState(!!note.pinned);
  const [error, setError] = useState(null);

  const onSubmitForm = (e) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length < 1) {
      setError(t("notes.contentRequired"));
      return;
    }
    setError(null);
    onSubmit({ content: trimmed, pinned: canPin ? pinned : false });
  };

  return (
    <form onSubmit={onSubmitForm} className="space-y-2">
      <textarea
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        maxLength={5000}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {canPin && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <FiPin className="h-3.5 w-3.5 text-amber-500" />
          {t("notes.pinThisNote")}
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiCheck className="h-3.5 w-3.5" />}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
};

const Modal = ({ children, onClose, title }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
            {title}
          </h3>
          <Button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <FiX className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default NotesPanel;
