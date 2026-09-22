import { Card, CardBody, Input, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import FeatureGroupServices from "@/services/FeatureGroupServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import FeatureGroupDrawer from "@/components/drawer/FeatureGroupDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import { Button } from "@sofia/ui";

const statusBadge = (status) => {
  const map = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.active;
};

const FeatureGroups = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreate = hasPermission("billing", "create") || hasPermission("platform", "create");
  const canUpdate = hasPermission("billing", "update");
  const canDelete = hasPermission("billing", "delete");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["feature-groups", searchText, statusFilter],
    queryFn: async () => {
      return await FeatureGroupServices.getAllFeatureGroups({
        search: searchText,
        status: statusFilter,
        sort: "displayOrder",
      });
    },
  });

  const groups = data?.data || [];

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
  };

  const handleDelete = async (id) => {
    try {
      await FeatureGroupServices.deleteFeatureGroup(id);
      successMessage(t("FeatureGroupDeleteSuccess") || "Feature group deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["feature-groups"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete feature group");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  return (
    <>
      <PageTitle>{t("FeatureGroupsPageTitle") || "Feature Groups"}</PageTitle>

      <MainDrawer>
        <FeatureGroupDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={(e) => { e.preventDefault(); }}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchFeatureGroup") || "Search by name or code"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus") || "All Status"}</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleReset}
                    type="button"
                    className="px-4 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
                {canCreate && (
                  <div className="w-full mx-1">
                    <Button
                      onClick={() => { setServiceId(undefined); toggleDrawer(); }}
                      className="h-12 w-full rounded-md whitespace-nowrap"
                    >
                      <span className="mr-2 flex items-center"><FiPlus /></span>
                      {t("AddFeatureGroup") || "Add Feature Group"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {isLoading ? (
        <TableLoading row={12} col={5} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : groups?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("Group")}</TableCell>
                <TableCell>{t("Code")}</TableCell>
                <TableCell>{t("Description")}</TableCell>
                <TableCell>{t("Features")}</TableCell>
                <TableCell>{t("Order")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: g.color || "#3B82F6" }}
                      >
                        {(g.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">{g.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700">
                      {g.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{g.description || "â€”"}</span>

                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {g.featureCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-sm">{g.displayOrder}</span></TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(g.status)}`}>
                      {g.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <ActionMenu
                        id={g._id}
                        title={g.name}
                        handleUpdate={canUpdate ? handleUpdate : undefined}
                        handleModalOpen={
                          canDelete ? (id, title) => handleDelete(id) : undefined
                        }
                        showEdit={canUpdate}
                        showDelete={canDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <NotFound title={t("NoFeatureGroups") || "Sorry, There are no feature groups right now."} />
      )}
    </>
  );
};

export default FeatureGroups;
