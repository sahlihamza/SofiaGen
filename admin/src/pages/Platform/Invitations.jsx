import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Card, CardBody, Badge } from "@windmill/react-ui";
import SortableDataTable from "@/components/tables/SortableDataTable";
import TableToolbar from "@/components/tables/TableToolbar";
import { CButton, PageHeader } from "@/components/ui";
import {
  FiPlus,
  FiMail,
  FiRefreshCw,
  FiTrash2,
  FiMoreVertical,
  FiClock,
  FiUserX,
  FiCheckCircle,
  FiXCircle,
  FiList,
  FiGrid,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import userAPI from "@/services/api/userAPI";
import roleAPI from "@/services/api/roleAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import ConfirmActionModal from "@/components/superadmin/modals/ConfirmActionModal";
import InviteUserDrawer from "@/components/drawer/InviteUserDrawer";
import { Button } from "@sofia/ui";

const STATUS_BADGES = {
  pending: { label: "Pending", type: "primary", className: "status-invited" },
  accepted: { label: "Accepted", type: "success", className: "status-active" },
  expired: { label: "Expired", type: "warning", className: "status-suspended" },
  cancelled: { label: "Cancelled", type: "neutral", className: "status-archived" },
  revoked: { label: "Revoked", type: "danger", className: "status-archived" },
};

const Invitations = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // table | cards
  const [selectedIds, setSelectedIds] = useState([]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    action: null,
    invitation: null,
  });
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, rowsPerPage, statusFilter]);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleClickOutside = (e) => {
      const dropdown = document.getElementById("invitation-dropdown-portal");
      if (dropdown && !dropdown.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setOpenDropdownId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdownId]);

  const { data: invitationsData, isLoading, error } = useQuery({
    queryKey: ["invitations", currentPage, rowsPerPage, debouncedSearch],
    queryFn: async () => {
      return await userAPI.getInvitations({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch,
      });
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["platformRoles"],
    queryFn: async () => roleAPI.getAllRoles({ scope: "platform", limit: 100 }),
  });

  const platformRoles = rolesData?.data?.data || rolesData?.data || [];

  const invitations = invitationsData?.data?.data || invitationsData?.data || [];
  const paginationData =
    invitationsData?.data?.pagination ||
    invitationsData?.pagination ||
    { total: 0, page: 1, limit: rowsPerPage, pages: 1 };
  const serverStats = invitationsData?.data?.stats || invitationsData?.stats;

  useEffect(() => {
    const pages = paginationData?.pages || 1;
    if (!isLoading && currentPage > pages) {
      setCurrentPage(pages);
    }
  }, [invitationsData, isLoading, currentPage, paginationData]);

  const filteredInvitations = useMemo(() => {
    if (statusFilter === "all") return invitations;
    return invitations.filter((i) => i.status === statusFilter);
  }, [invitations, statusFilter]);

  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    const total = paginationData.total || invitations.length;
    const pending = invitations.filter((i) => i.status === "pending").length;
    const accepted = invitations.filter((i) => i.status === "accepted").length;
    const expired = invitations.filter((i) => i.status === "expired").length;
    const cancelled = invitations.filter((i) => i.status === "cancelled").length;
    const revoked = invitations.filter((i) => i.status === "revoked").length;
    return { total, pending, accepted, expired, cancelled, revoked };
  }, [invitations, paginationData.total, serverStats]);

  const handleCreate = async (payload) => {
    try {
      setIsSubmitting(true);
      await userAPI.createInvitation(payload);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setIsDrawerOpen(false);
      notifySuccess(t("InvitationCreatedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (invitation) => {
    try {
      setIsSubmitting(true);
      await userAPI.resendInvitationByToken(invitation._id);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      notifySuccess(t("InvitationResentSuccess"));
      setOpenDropdownId(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (invitation) => {
    try {
      setIsSubmitting(true);
      await userAPI.cancelInvitation(invitation._id);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      notifySuccess(t("InvitationCancelledSuccess"));
      setConfirmModal({ isOpen: false, action: null, invitation: null });
      setOpenDropdownId(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (invitation) => {
    try {
      setIsSubmitting(true);
      await userAPI.revokeInvitation(invitation._id);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      notifySuccess(t("InvitationRevokedSuccess"));
      setConfirmModal({ isOpen: false, action: null, invitation: null });
      setOpenDropdownId(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (invitation) => {
    try {
      setIsSubmitting(true);
      await userAPI.deleteInvitation(invitation._id);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      notifySuccess(t("InvitationDeletedSuccess"));
      setConfirmModal({ isOpen: false, action: null, invitation: null });
      setOpenDropdownId(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfirm = (action, invitation) => {
    setConfirmModal({ isOpen: true, action, invitation });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false, action: null, invitation: null });
  };

  const toggleDropdown = (event, invitationId) => {
    if (openDropdownId === invitationId) {
      setOpenDropdownId(null);
      setDropdownPos(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 184;
    setDropdownPos({
      top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menuHeight - 8)),
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    setOpenDropdownId(invitationId);
  };

  const handleConfirm = (action) => {
    if (action === "cancel") {
      handleCancel(confirmModal.invitation);
    } else if (action === "revoke") {
      handleRevoke(confirmModal.invitation);
    } else if (action === "delete") {
      handleDelete(confirmModal.invitation);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    try {
      setIsSubmitting(true);
      if (action === "cancel") {
        await Promise.all(selectedIds.map((id) => userAPI.cancelInvitation(id)));
        notifySuccess(t("BulkCancelSuccess", { count: selectedIds.length }));
      } else if (action === "revoke") {
        await Promise.all(selectedIds.map((id) => userAPI.revokeInvitation(id)));
        notifySuccess(t("BulkRevokeSuccess", { count: selectedIds.length }));
      } else if (action === "delete") {
        await Promise.all(selectedIds.map((id) => userAPI.deleteInvitation(id)));
        notifySuccess(t("BulkDeleteSuccess", { count: selectedIds.length }));
      } else if (action === "resend") {
        await Promise.all(selectedIds.map((id) => userAPI.resendInvitationByToken(id)));
        notifySuccess(t("BulkResendSuccess", { count: selectedIds.length }));
      }
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setSelectedIds([]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full">
      <PageHeader
        title={t("Invitations")}
        description="Manage platform invitations â€” resend pending ones, revoke access before it's used."
        actions={<CButton icon="plus" onClick={() => setIsDrawerOpen(true)}>{t("InviteUser")}</CButton>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <FiMail size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Total") || "Total"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className={`shadow-xs bg-white dark:bg-gray-800 ${statusFilter === "pending" ? "ring-2 ring-amber-400" : ""}`}>
          <CardBody className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => { setStatusFilter("pending"); setCurrentPage(1); }}>
            <div className="p-2.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300">
              <FiClock size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Pending") || "Pending"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className={`shadow-xs bg-white dark:bg-gray-800 ${statusFilter === "accepted" ? "ring-2 ring-emerald-400" : ""}`}>
          <CardBody className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => { setStatusFilter("accepted"); setCurrentPage(1); }}>
            <div className="p-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300">
              <FiCheckCircle size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.accepted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Accepted") || "Accepted"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className={`shadow-xs bg-white dark:bg-gray-800 ${statusFilter === "expired" ? "ring-2 ring-red-400" : ""}`}>
          <CardBody className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => { setStatusFilter("expired"); setCurrentPage(1); }}>
            <div className="p-2.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">
              <FiXCircle size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.expired}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Expired") || "Expired"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className={`shadow-xs bg-white dark:bg-gray-800 ${statusFilter === "cancelled" ? "ring-2 ring-slate-400" : ""}`}>
          <CardBody className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => { setStatusFilter("cancelled"); setCurrentPage(1); }}>
            <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
              <FiUserX size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.cancelled}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Cancelled") || "Cancelled"}</p>
            </div>
          </CardBody>
        </Card>
        <Card className={`shadow-xs bg-white dark:bg-gray-800 ${statusFilter === "revoked" ? "ring-2 ring-purple-400" : ""}`}>
          <CardBody className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => { setStatusFilter("revoked"); setCurrentPage(1); }}>
            <div className="p-2.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300">
              <FiTrash2 size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.revoked}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Revoked") || "Revoked"}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Toolbar: search + view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {statusFilter === "all"
            ? "Showing all invitations â€” click a stat card to filter by status."
            : `Filtered by status: ${statusFilter}.`}
        </div>
        <div className="flex items-center gap-2">
          <TableToolbar
            search={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={t("SearchInvitations")}
          />
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 text-sm ${viewMode === "table" ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              title={t("ListView")}
            >
              <FiList size={16} />
            </Button>
            <Button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 text-sm ${viewMode === "cards" ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              title={t("CardView")}
            >
              <FiGrid size={16} />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableLoading row={rowsPerPage} col={6} />
      ) : error ? (
        <NotFound title={error?.response?.data?.message || error?.message || t("ErrorLoadingData")} />
      ) : !invitations || invitations.length === 0 ? (
        <NotFound
          title={debouncedSearch ? (t("NoSearchResults") || "No results found") : t("NoInvitationsFound")}
          text={debouncedSearch ? (t("TryAdjustingFilters") || "Try adjusting your search.") : undefined}
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {filteredInvitations.map((invitation) => {
            const statusBadge = STATUS_BADGES[invitation.status] || STATUS_BADGES.pending;
            const isExpiringSoon =
              invitation.expiresAt &&
              new Date(invitation.expiresAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
            const displayName = [invitation.firstName, invitation.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
            const initial = (displayName || invitation.email || "?").charAt(0).toUpperCase();
            return (
              <Card key={invitation._id} className="shadow-xs bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200 overflow-visible">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${statusBadge.className === "status-invited" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" : statusBadge.className === "status-active" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" : statusBadge.className === "status-suspended" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"}`}>
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {displayName || "No name"}
                        </p>
                        <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {invitation.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDropdownPos({ top: rect.bottom + 4, left: rect.right - 192 });
                          setOpenDropdownId(isDropdownOpen ? null : invitation._id);
                        }}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <FiMoreVertical size={18} />
                      </Button>
                      <Badge type={statusBadge.type} className="font-medium text-xs">{t(statusBadge.label)}</Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Roles</span>
                      <span className="flex flex-wrap justify-end gap-1">
                        {invitation.roleIds && invitation.roleIds.length > 0 ? (
                          invitation.roleIds.map((r, index) => (
                            <span key={index} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                              {r?.name || String(r)}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">â€”</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Invited by</span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {invitation.invitedBy?.name || invitation.invitedBy?.email || "â€”"}
                      </span>
                    </div>
                    {isExpiringSoon && (
                      <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 -mx-2 px-2 py-1.5 rounded-lg">
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Expires</span>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <FiClock size={12} />
                      {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : "â€”"}
                    </span>
                    {invitation.expiresAt && (
                      <span className={`flex items-center gap-1 ${isExpiringSoon ? "text-amber-500 font-semibold" : ""}`}>
                        <FiClock size={12} />
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <SortableDataTable
          columns={[
            { key: "email", header: t("Email"), sortable: false },
            { key: "name", header: t("Name"), sortable: false },
            { key: "status", header: t("Status"), sortable: false },
            { key: "role", header: t("Role"), sortable: false },
            { key: "invitedBy", header: t("InvitedBy"), sortable: false },
            { key: "createdAt", header: t("CreatedAt"), sortable: false },
            { key: "expiresAt", header: t("ExpiresAt"), sortable: false },
            { key: "actions", header: t("Actions"), sortable: false },
          ]}
          rows={filteredInvitations}
          getRowKey={(invitation) => invitation._id}
          rowSelection={true}
          selectedRowKeys={selectedIds}
          onSelectionChange={(keys) => setSelectedIds(Array.isArray(keys) ? keys : [])}
          showSelectAll={true}
          selectionActions={(
            <div className="flex items-center gap-2">
              <CButton
                size="sm"
                variant="secondary"
                icon="refresh"
                onClick={() => handleBulkAction("resend")}
                disabled={isSubmitting}
              >
                {t("Resend")}
              </CButton>
              <CButton
                size="sm"
                variant="warning"
                icon="user-x"
                onClick={() => handleBulkAction("cancel")}
                disabled={isSubmitting}
              >
                {t("Cancel")}
              </CButton>
              <CButton
                size="sm"
                variant="danger"
                icon="trash"
                onClick={() => handleBulkAction("delete")}
                disabled={isSubmitting}
              >
                {t("Delete")}
              </CButton>
            </div>
          )}
          renderCell={({ row, column }) => {
            switch (column.key) {
              case "email":
                return <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{row.email}</span>;
              case "name":
                return (
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {row.firstName || row.lastName ? `${row.firstName || ""} ${row.lastName || ""}`.trim() : "â€”"}
                  </span>
                );
              case "status":
                return <Badge type={STATUS_BADGES[row.status]?.type || "primary"}>{t(STATUS_BADGES[row.status]?.label || "Pending")}</Badge>;
              case "role":
                return (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {row.roleIds && row.roleIds.length > 0 ? row.roleIds.map((r) => r?.name || String(r)).join(", ") : "â€”"}
                  </span>
                );
              case "invitedBy":
                return <span className="text-sm text-gray-600 dark:text-gray-300">{row.invitedBy?.name || row.invitedBy?.email || "â€”"}</span>;
              case "createdAt":
                return (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "â€”"}
                  </span>
                );
              case "expiresAt":
                return (
                  <span className="text-sm">
                    {row.expiresAt ? (
                      <span className={row.expiresAt < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? "text-amber-600 dark:text-amber-400 font-medium" : "text-gray-600 dark:text-gray-300"}>
                        {new Date(row.expiresAt).toLocaleDateString()}
                        {row.expiresAt < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && " âš ï¸"}
                      </span>
                    ) : (
                      "â€”"
                    )}
                  </span>
                );
              case "actions":
                return (
                  <span className="text-center relative">
                    <div className="flex items-center justify-center gap-1">
                      <div className="relative">
                        <Button
                          onClick={(e) => {
                            if (openDropdownId === row._id) {
                              setOpenDropdownId(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPos({ top: rect.bottom + 4, left: rect.right - 192 });
                              setOpenDropdownId(row._id);
                            }
                          }}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={t("Actions") || "Actions"}
                        >
                          <FiMoreVertical size={18} />
                        </Button>
                      </div>
                    </div>
                  </span>
                );
              default:
                return row[column.key];
            }
          }}
          pagination={{
            page: paginationData.page,
            total: paginationData.total || 0,
            limit: paginationData.limit || DEFAULT_PAGE_SIZE,
            onChange: (page) => setCurrentPage(page),
          }}
        />
      )}

      {openDropdownId &&
        dropdownPos &&
        (() => {
          const invitation =
            filteredInvitations.find((i) => i._id === openDropdownId) ||
            invitations.find((i) => i._id === openDropdownId);
          if (!invitation) return null;
          return createPortal(
            <div
              id="invitation-dropdown-portal"
              className="fixed z-[1000] max-h-48 w-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="py-1">
                {(invitation.status === "pending" || invitation.status === "expired") && (
                  <Button
                    type="button"
                    onClick={() => handleResend(invitation)}
                    variant="ghost"
                    fullWidth
                    className="justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    {t("Resend")}
                  </Button>
                )}
                {invitation.status !== "accepted" && invitation.status !== "revoked" && (
                  <Button
                    type="button"
                    onClick={() => { setConfirmModal({ isOpen: true, action: "cancel", invitation }); setOpenDropdownId(null); }}
                    variant="ghost"
                    fullWidth
                    className="justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-orange-300"
                  >
                    <FiUserX className="w-4 h-4" />
                    {t("Cancel")}
                  </Button>
                )}
                {invitation.status === "pending" && (
                  <Button
                    type="button"
                    onClick={() => { setConfirmModal({ isOpen: true, action: "revoke", invitation }); setOpenDropdownId(null); }}
                    variant="ghost"
                    fullWidth
                    className="justify-start rounded-none px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-red-300"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    {t("Revoke")}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => { setConfirmModal({ isOpen: true, action: "delete", invitation }); setOpenDropdownId(null); }}
                  variant="ghost"
                  fullWidth
                  className="justify-start rounded-none px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-800 dark:text-red-300 dark:hover:bg-gray-700 dark:hover:text-red-200"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {t("Delete")}
                </Button>
              </div>
            </div>,
            document.body
          );
        })()}

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        action={confirmModal.action}
        user={confirmModal.invitation}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirm}
      />

      {/* Create Invitation Drawer */}
      <InviteUserDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
        platformRoles={platformRoles}
      />
    </div>
  );
};

export default Invitations;
