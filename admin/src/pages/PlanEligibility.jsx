import { Card, CardBody, Input, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { SidebarContext } from "@/context/SidebarContext";
import PlanEligibilityServices from "@/services/PlanEligibilityServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlanEligibilityDrawer from "@/components/drawer/PlanEligibilityDrawer";
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
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.draft;
};

const appliesToLabel = (v) => v?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const PlanEligibility = () => {
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
    queryKey: ["plan-eligibility", searchText, statusFilter],
    queryFn: () =>
      PlanEligibilityServices.getAllRules({
        search: searchText,
        status: statusFilter,
        sort: "-createdAt",
      }),
  });

  const rules = data?.data || [];

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
  };

  const handleDelete = async (id) => {
    try {
      await PlanEligibilityServices.deleteRule(id);
      successMessage("Eligibility rule deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-eligibility"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete eligibility rule");
    }
  };

  const handleClone = async (id) => {
    try {
      await PlanEligibilityServices.cloneRule(id);
      successMessage("Eligibility rule cloned successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-eligibility"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to clone eligibility rule");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await PlanEligibilityServices.updateRuleStatus(id, status);
      successMessage(`Eligibility rule status set to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["plan-eligibility"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  return (
    <>
      <PageTitle>{t("PlanEligibilityPageTitle") || "Plan Eligibility Rules"}</PageTitle>

      <MainDrawer>
        <PlanEligibilityDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form onSubmit={(e) => e.preventDefault()} className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex">
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchEligibilityRule") || "Search by name"}
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
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button layout="outline" onClick={handleReset} type="button" className="px-4 py-2 h-12 text-sm dark:bg-gray-700">
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
                {canCreate && (
                  <div className="w-full mx-1">
                    <Button onClick={() => { setServiceId(undefined); toggleDrawer(); }} className="h-12 w-full rounded-md whitespace-nowrap">
                      <span className="mr-2 flex items-center"><FiPlus /></span>
                      {t("AddEligibilityRule") || "Build Rule"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {isLoading ? (
        <TableLoading row={12} col={7} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : rules?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("Rule")}</TableCell>
                <TableCell>{t("Plan")}</TableCell>
                <TableCell>{t("AppliesTo")}</TableCell>
                <TableCell>{t("Priority")}</TableCell>
                <TableCell>{t("Conditions")}</TableCell>
                <TableCell>{t("Approval")}</TableCell>
                <TableCell>{t("Version")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-indigo-600">
                        {(r.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <span className="text-sm font-medium">{r.name}</span>
                        {r.description && (
                          <p className="text-xs text-gray-500 max-w-xs truncate">{r.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700">
                      {r.planId?.name || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700">
                      {appliesToLabel(r.appliesTo)}
                    </span>
                  </TableCell>
                  <TableCell><span className="text-sm">{r.priority}</span></TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      {r.conditionCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.requiresCommercialApproval ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${r.approved ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"}`}>
                        {r.approved ? "Approved" : "Pending"}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        Not required
                      </span>
                    )}
                  </TableCell>
                  <TableCell><span className="text-sm">v{r.version}</span></TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <ActionMenu
                        id={r._id}
                        title={r.name}
                        handleUpdate={canUpdate ? handleUpdate : undefined}
                        handleModalOpen={canDelete ? () => handleDelete(r._id) : undefined}
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
        <NotFound title={t("NoEligibilityRules") || "Sorry, There are no eligibility rules right now."} />
      )}
    </>
  );
};

export default PlanEligibility;
