import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Link, useHistory } from "react-router-dom";
import { Card, CardBody, Badge } from "@windmill/react-ui";
import { FiPlus, FiEdit, FiTrash2, FiUser, FiMoreHorizontal, FiMoreVertical, FiUsers, FiEye, FiAlertTriangle, FiList, FiGrid } from "react-icons/fi";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import userAPI from "@/services/api/userAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import ConfirmModal from "@/components/modals/CConfirmModal";
import CreateTeamDrawer from "@/components/drawer/CreateTeamDrawer";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { CButton, IconButton, PageHeader } from "@/components/ui";

import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";
import { Button } from "@sofia/ui";


const Teams = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [selectedIds, setSelectedIds] = useState([]);
  const [dropdownPos, setDropdownPos] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [debouncedSearch, rowsPerPage]);

  const { data: teamsData, isLoading, error } = useQuery({
    queryKey: ["teams", currentPage, rowsPerPage, debouncedSearch],
    queryFn: async () => {
      return await userAPI.getTeams({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch,
      });
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const teams = teamsData?.data?.data || teamsData?.data || [];
  const paginationData =
    teamsData?.data?.pagination ||
    teamsData?.pagination ||
    { total: 0, page: 1, limit: rowsPerPage, pages: 1 };
  const serverStats = teamsData?.data?.stats || teamsData?.stats;

  useEffect(() => {
    const pages = paginationData?.pages || 1;
    if (!isLoading && currentPage > pages) {
      setCurrentPage(pages);
    }
  }, [teamsData, isLoading, currentPage, paginationData]);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleClickOutside = (e) => {
      const dropdownPortal = document.getElementById("team-actions-dropdown-portal");
      const dropdownInline = e.target.closest(".team-card-inline-dropdown");
      if (dropdownPortal && !dropdownPortal.contains(e.target) && !dropdownInline) {
        setOpenDropdownId(null);
        setDropdownPos(null);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setOpenDropdownId(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [openDropdownId]);

  const stats = useMemo(() => {
    if (serverStats) return serverStats;
    const total = paginationData.total || teams.length;
    const active = teams.filter((t) => t.status === "active").length;
    const inactive = teams.filter((t) => t.status === "inactive").length;
    const archived = teams.filter((t) => t.status === "archived").length;
    return { total, active, inactive, archived };
  }, [teams, paginationData.total, serverStats]);

  const handleArchive = async (team) => {
    try {
      setIsSubmitting(true);
      await userAPI.archiveTeam(team._id);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      notifySuccess(t("TeamArchivedSuccess") || t("TeamDeletedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (team) => {
    try {
      setIsSubmitting(true);
      await userAPI.deleteTeam(team._id);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      notifySuccess(t("TeamDeletedSuccess"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (team) => {
    setTeamToDelete(team);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (teamToDelete) {
      await handleDelete(teamToDelete);
      setDeleteModalOpen(false);
      setTeamToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setTeamToDelete(null);
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    setIsDrawerOpen(true);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsSubmitting(true);
      await Promise.all(selectedIds.map((id) => userAPI.deleteTeam(id)));
      notifySuccess(t("BulkTeamDeleteSuccess", { count: selectedIds.length }) || `${selectedIds.length} teams deleted`);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setSelectedIds([]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = () => {
    setEditingTeam(null);
    setIsDrawerOpen(true);
  };

  const handleCreateSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      await userAPI.createTeam(payload);
      notifySuccess(t("TeamCreatedSuccess"));
      queryClient.invalidateQueries(["teams"]);
      setIsDrawerOpen(false);
      setEditingTeam(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      if (payload._id) {
        await userAPI.updateTeam(payload._id, payload);
        notifySuccess(t("TeamUpdatedSuccess"));
      } else {
        await userAPI.createTeam(payload);
        notifySuccess(t("TeamCreatedSuccess"));
      }
      queryClient.invalidateQueries(["teams"]);
      setIsDrawerOpen(false);
      setEditingTeam(null);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full">
      <PageHeader
        title={t("Teams")}
        actions={<CButton onClick={handleCreate} icon="plus">{t("CreateTeam")}</CButton>}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("TotalTeams") || "Total Teams"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              <FiUser size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("ActiveTeams") || "Active"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("InactiveTeams") || "Inactive"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.inactive}</p>
            </div>
          </CardBody>
        </Card>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
              <FiEdit size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("ArchivedTeams") || "Archived"}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.archived}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search + view toggle */}
      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="p-4 flex items-center justify-between gap-4">
          <TableToolbar
            className="flex-1"
            search={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder={t("SearchTeams")}
          />
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <CButton
              variant={viewMode === "table" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              title={t("ListView") || "Table"}
            >
              <FiList size={16} />
            </CButton>
            <CButton
              variant={viewMode === "cards" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              title={t("CardView") || "Cards"}
            >
              <FiGrid size={16} />
            </CButton>
          </div>

        </CardBody>
      </Card>

      {isLoading ? (
        <TableLoading row={rowsPerPage} col={5} />
      ) : error ? (
        <NotFound title={error?.response?.data?.message || error?.message || t("ErrorLoadingData")} />
      ) : !teams || teams.length === 0 ? (
        <NotFound
          title={debouncedSearch ? (t("NoSearchResults") || "No results found") : t("NoTeamsFound")}
          text={debouncedSearch ? (t("TryAdjustingFilters") || "Try adjusting your search.") : undefined}
        />
      ) : viewMode === "table" ? (
        <SortableDataTable
          columns={[
            { key: "name", header: t("TeamName") || "Name", sortable: false },
            { key: "description", header: t("Description") || "Description", sortable: false },
            { key: "department", header: t("Department") || "Department", sortable: false },
            { key: "leader", header: t("TeamLeader") || "Leader", sortable: false },
            { key: "members", header: t("Members") || "Members", sortable: false },
            { key: "actions", header: t("Actions") || "Actions", sortable: false },
          ]}
          rows={teams}
          getRowKey={(team) => team._id}
          rowSelection={true}
          selectedRowKeys={selectedIds}
          onSelectionChange={(keys) => setSelectedIds(Array.isArray(keys) ? keys : [])}
          showSelectAll={true}
          selectionActions={(
            <CButton
              size="sm"
              variant="danger"
              icon="trash"
              onClick={handleBulkDelete}
              disabled={isSubmitting}
            >
              {t("Delete")} ({selectedIds.length})
            </CButton>
          )}
          renderCell={({ row, column }) => {
            switch (column.key) {
              case "name":
                return (
                  <Link to={`/platform/teams/${row._id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-emerald-600">
                    {row.name}
                  </Link>
                );
              case "description":
                return (
                  <span className="block max-w-xs truncate text-sm text-gray-600 dark:text-gray-300" title={row.description || ""}>
                    {row.description || "â€”"}
                  </span>
                );
              case "department":
                return row.department ? <Badge type="neutral">{row.department}</Badge> : <span className="text-gray-400">â€”</span>;
              case "leader":
                return (
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {row.leader ? (typeof row.leader === "object" ? row.leader.name || row.leader.email : row.leader) : "â€”"}
                  </span>
                );
              case "members":
                return <span className="text-sm text-gray-700 dark:text-gray-300">{row.membersCount ?? row.memberCount ?? 0}</span>;
              case "actions":
                return (
                  <div className="flex items-center justify-center">
                    <IconButton
                      icon="more"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const nextOpen = openDropdownId === row._id ? null : row._id;
                        setOpenDropdownId(nextOpen);
                        setDropdownPos(nextOpen ? { top: rect.bottom + 4, left: rect.right - 176 } : null);
                      }}
                      aria-label={t("Actions") || "Actions"}
                      title={t("Actions") || "Actions"}
                    />
                  </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <Link key={team._id} to={`/platform/teams/${team._id}`} className="block">
              <Card className="shadow-xs overflow-visible bg-white dark:bg-gray-800 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {team.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {team.description || t("NoDescription")}
                      </p>
                    </div>
                    <div className="relative team-card-inline-dropdown" onClick={(e) => e.preventDefault()}>
                      <IconButton
                        icon="more"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDropdownPos(null);
                          setOpenDropdownId(openDropdownId === team._id ? null : team._id);
                        }}
                        aria-label="Actions"
                      />

                      {openDropdownId === team._id && (
                        <div className="team-card-inline-dropdown absolute right-0 top-full mt-1 w-40 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-50">
                          <div className="py-1">
                            <Button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setOpenDropdownId(null);
                                setDropdownPos(null);
                                history.push(`/platform/teams/${team._id}`);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400"
                            >
                              <FiEye className="w-4 h-4" />
                              {t("Details") || "Details"}
                            </Button>
                            <Button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); setOpenDropdownId(null); setDropdownPos(null); handleEdit(team); }}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                            >
                              <FiEdit className="w-4 h-4" />
                              {t("Edit")}
                            </Button>
                            <Button
                              type="button"
                              onClick={(event) => { event.stopPropagation(); setOpenDropdownId(null); setDropdownPos(null); handleArchive(team); }}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400"
                            >
                              <FiTrash2 className="w-4 h-4" />
                              {t("Archive") || t("Delete")}
                            </Button>
                            <Button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setOpenDropdownId(null);
                                setDropdownPos(null);
                                openDeleteModal(team);
                              }}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-400"
                            >
                              <FiAlertTriangle className="w-4 h-4" />
                              {t("Delete")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {team.department && (
                    <div className="mt-3">
                      <Badge type="neutral">
                        {team.department}
                      </Badge>
                    </div>
                  )}

                  {team.leader && (
                    <div className="mt-3 flex items-center gap-2">
                      <FiUser size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {typeof team.leader === "object"
                          ? team.leader.name || team.leader.email
                          : team.leader}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <FiUser size={16} />
                    <span>{team.membersCount ?? team.memberCount ?? 0} {t("Members")}</span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {openDropdownId &&
        dropdownPos &&
        (() => {
          const team = teams.find((t) => t._id === openDropdownId);
          if (!team) return null;
          return createPortal(
            <div
              id="team-actions-dropdown-portal"
              className="fixed w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-50"
              style={{ top: dropdownPos.top, left: dropdownPos.left }}
            >
              <div className="py-1">
                <Button
                  type="button"
                  onClick={() => { setOpenDropdownId(null); setDropdownPos(null); history.push(`/platform/teams/${team._id}`); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400"
                >
                  <FiEye className="w-4 h-4" />
                  {t("Details") || "Details"}
                </Button>
                <Button
                  type="button"
                  onClick={() => { setOpenDropdownId(null); setDropdownPos(null); handleEdit(team); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                >
                  <FiEdit className="w-4 h-4" />
                  {t("Edit") || "Edit"}
                </Button>
                <Button
                  type="button"
                  onClick={() => { setOpenDropdownId(null); setDropdownPos(null); openDeleteModal(team); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {t("Delete") || "Delete"}
                </Button>
              </div>
            </div>,
            document.body
          );
        })()}

      <CreateTeamDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingTeam(null);
        }}
        isSubmitting={isSubmitting}
        onSubmit={editingTeam ? handleEditSubmit : handleCreateSubmit}
        team={editingTeam}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title={t("DeleteTeam") || t("Delete")}
        description={t("ConfirmDeleteTeam", { name: teamToDelete?.name || "" })}
        confirmLabel={t("Delete")}
        cancelLabel={t("CancelBtn")}
        danger
        loading={isSubmitting}
      />
    </div>
  );
};

export default Teams;
