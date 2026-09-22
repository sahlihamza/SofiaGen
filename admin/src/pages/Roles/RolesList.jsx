import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination, Card, CardBody, Input, Badge, Select } from "@windmill/react-ui";
import {
  FiSearch,
  FiEye,
  FiTrash2,
  FiShield,
  FiLock,
  FiMoreHorizontal,
  FiGrid,
  FiList,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import useFilter from "@/hooks/useFilter";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import DeleteModal from "@/components/modal/DeleteModal";
import roleAPI from "@/services/api/roleAPI";
import useNotification from "@/hooks/useNotification";
import OrderMenu from "@/components/order/OrderMenu";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";
import { CButton } from "@/components/ui";
import { Button } from "@sofia/ui";

const RolesList = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const { currentPage, handleChangePage, searchText, setSearchText } = useFilter();

  const [activeTab, setActiveTab] = useState("roles");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);

  const pageSize = DEFAULT_PAGE_SIZE;

  const { data: rolesData, isLoading: isLoadingRoles, error: rolesError } = useQuery({
    queryKey: ["platformRoles", currentPage, searchText],
    queryFn: async () => {
      const res = await roleAPI.getAllRoles({
        page: currentPage,
        limit: pageSize,
        search: searchText,
      });
      return res;
    },
    enabled: activeTab === "roles",
  });

  const [permPage, setPermPage] = useState(1);
  const [permSearch, setPermSearch] = useState("");
  const [permModule, setPermModule] = useState("");
  const [permRisk, setPermRisk] = useState("");

  const { data: permsData, isLoading: isLoadingPerms, error: permsError } = useQuery({
    queryKey: ["platformPermissions", permPage, permSearch, permModule, permRisk],
    queryFn: async () => {
      const res = await roleAPI.getAllPermissions({
        scope: "platform",
        module: permModule || undefined,
        riskLevel: permRisk || undefined,
        search: permSearch || undefined,
        page: permPage,
        limit: pageSize,
      });
      return res;
    },
    enabled: activeTab === "permissions",
  });

  const roles = rolesData?.data || [];
  const rolesPagination = rolesData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 1 };

  const permissions = permsData?.data?.data || permsData?.data || [];
  const permsPagination = permsData?.data?.pagination || permsData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 1 };

  const modules = useMemo(() => {
    const mods = new Set();
    (permissions || []).forEach((p) => { if (p.module) mods.add(p.module); });
    return Array.from(mods).sort();
  }, [permissions]);

  const handleDelete = async (roleId) => {
    try {
      await roleAPI.deleteRole(roleId);
      queryClient.invalidateQueries({ queryKey: ["platformRoles"] });
      successMessage(t("RoleDeletedSuccess"));
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteRoleId(null);
    }
  };

  const tabs = [
    { key: "roles", label: t("RolesPageTitle") || "Roles", icon: <FiList size={16} /> },
    { key: "permissions", label: t("RolePermissionsPageTitle") || "Permissions", icon: <FiGrid size={16} /> },
  ];

  return (
    <div className="mx-auto w-full">
      <PageTitle>Roles &amp; Permissions</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
        <CardBody className="p-2">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>

      {activeTab === "roles" && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FiShield className="text-emerald-600 text-xl" />
                <span className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                  {t("AllRoles")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  placeholder={t("SearchRoles")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full md:w-64"
                />
                <CButton icon="plus" onClick={() => history.push("/platform/roles/new")}>
                  {t("CreateRole")}
                </CButton>
              </div>
            </div>

            {isLoadingRoles ? (
              <TableLoading row={10} col={5} />
            ) : rolesError ? (
              <NotFound title="Error loading roles" />
            ) : (
              <SortableDataTable
                columns={[
                  { key: "name", header: t("Name"), sortable: false },
                  { key: "slug", header: t("Slug"), sortable: false },
                  { key: "scope", header: t("Scope"), sortable: false },
                  { key: "description", header: t("Description"), sortable: false },
                  { key: "permissions", header: t("Permissions"), sortable: false },
                  { key: "actions", header: t("Actions"), sortable: false },
                ]}
                rows={roles}
                getRowKey={(row) => row._id}
                renderCell={({ row, column }) => {
                  switch (column.key) {
                    case "name":
                      return <span className="font-medium">{row.name}</span>;
                    case "slug":
                      return (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {row.slug}
                        </code>
                      );
                    case "scope":
                      return (
                        <div className="flex items-center gap-2">
                          <Badge type={row.scope === "platform" ? "info" : "warning"}>
                            {row.scope}
                          </Badge>
                          {row.isSystem && (
                            <Badge type="neutral">
                              <span className="inline-flex items-center gap-1">
                                <FiLock size={12} />
                                SystÃ¨me
                              </span>
                            </Badge>
                          )}
                        </div>
                      );
                    case "description":
                      return (
                        <span
                          className="block max-w-xs truncate"
                          title={row.description || ""}
                        >
                          {row.description || "-"}
                        </span>
                      );
                    case "permissions":
                      return (
                        <Badge type="gray">
                          {(row.permissions || []).length}
                        </Badge>
                      );
                    case "actions":
                      return (
                        <div className="flex justify-end">
                          <OrderMenu
                            items={[
                              {
                                key: "details",
                                label: t("Details") || "Details",
                                icon: <FiEye size={15} />,
                                onClick: () => history.push(`/platform/roles/${row._id}`),
                              },
                              {
                                key: "edit",
                                label: t("Edit") || "Edit",
                                icon: <FiShield size={15} />,
                                onClick: () => history.push(`/platform/roles/${row._id}/edit`),
                              },
                              !row.isSystem && !row.isPredefined && { key: "delete-separator", type: "separator" },
                              !row.isSystem && !row.isPredefined && {
                                key: "delete",
                                label: t("Delete") || "Delete",
                                icon: <FiTrash2 size={15} />,
                                danger: true,
                                onClick: () => {
                                  setDeleteRoleId(row._id);
                                  setIsDeleteModalOpen(true);
                                },
                              },
                            ]}
                            renderTrigger={({ ref, onClick, isOpen }) => (
                              <Button
                                ref={ref}
                                type="button"
                                onClick={onClick}
                                aria-haspopup="menu"
                                aria-expanded={isOpen}
                                title={t("Actions") || "Actions"}
                                aria-label={t("Actions") || "Actions"}
                                className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700 focus:outline-none dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              >
                                <FiMoreHorizontal size={18} />
                              </Button>
                            )}
                          />
                        </div>
                      );
                    default:
                      return row[column.key];
                  }
                }}
                pagination={{
                  page: currentPage,
                  total: rolesPagination.total,
                  limit: pageSize,
                  onChange: handleChangePage,
                }}
              />
            )}
          </CardBody>
        </Card>
      )}

      {activeTab === "permissions" && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <FiShield className="text-emerald-600 text-xl" />
                <span className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                  {t("RolePermissionsPageTitle") || "Permissions"}
                </span>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <Input
                  placeholder={t("Search") || "Search"}
                  value={permSearch}
                  onChange={(e) => { setPermSearch(e.target.value); setPermPage(1); }}
                  className="w-full md:w-64"
                />
                <Select
                  value={permModule}
                  onChange={(e) => { setPermModule(e.target.value); setPermPage(1); }}
                  className="w-full md:w-48"
                >
                  <option value="">{t("AllModules") || "All modules"}</option>
                  {modules.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </Select>
                <Select
                  value={permRisk}
                  onChange={(e) => { setPermRisk(e.target.value); setPermPage(1); }}
                  className="w-full md:w-40"
                >
                  <option value="">{t("AllRiskLevels") || "All risks"}</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            </div>

            {isLoadingPerms ? (
              <TableLoading row={10} col={5} />
            ) : permsError ? (
              <NotFound
                title="Error loading permissions"
                text={
                  (permsError?.response?.data?.message ||
                    permsError?.message ||
                    JSON.stringify(permsError))
                }
              />
            ) : (
              <SortableDataTable
                columns={[
                  { key: "code", header: "Code", sortable: false },
                  { key: "module", header: "Module", sortable: false },
                  { key: "action", header: "Action", sortable: false },
                  { key: "risk", header: "Risk", sortable: false },
                  { key: "description", header: "Description", sortable: false },
                ]}
                rows={permissions}
                getRowKey={(row) => row._id || row.code}
                renderCell={({ row, column }) => {
                  switch (column.key) {
                    case "code":
                      return (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {row.code}
                        </code>
                      );
                    case "module":
                      return <span>{row.module}</span>;
                    case "action":
                      return <span>{row.action}</span>;
                    case "risk":
                      return (
                        <Badge type={row.riskLevel === "critical" || row.riskLevel === "high" ? "danger" : row.riskLevel === "medium" ? "warning" : "success"}>
                          {row.riskLevel}
                        </Badge>
                      );
                    case "description":
                      return (
                        <span
                          className="block max-w-xs truncate"
                          title={row.description || ""}
                        >
                          {row.description || "-"}
                        </span>
                      );
                     default:
                      return row[column.key];
                  }
                }}
                pagination={{
                  page: permPage,
                  total: permsPagination.total,
                  limit: pageSize,
                  onChange: setPermPage,
                }}
              />
            )}
          </CardBody>
        </Card>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteRoleId(null);
        }}
        onDelete={() => handleDelete(deleteRoleId)}
        title={t("DeleteRole")}
        message={t("DeleteRoleConfirm")}
      />
    </div>
  );
};

export default RolesList;
