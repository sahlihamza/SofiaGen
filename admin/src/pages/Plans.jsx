import { Card, CardBody, Input, Pagination, Table, TableCell, TableContainer, TableFooter, TableHeader, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus, FiCopy } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import PlanServices from "@/services/PlanServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlanDrawer from "@/components/drawer/PlanDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import PlanTable from "@/components/plan/PlanTable";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ClonePlanModal from "@/components/plan/ClonePlanModal";
import { Button } from "@sofia/ui";

const Plans = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, title, setServiceId } = useToggleDrawer();

  const canCreatePlan = hasPermission("plans", "create");
  const canUpdatePlan = hasPermission("plans", "update");

  // Pagination and filters state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  // Clone modal state
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloneData, setCloneData] = useState({ name: "", slug: "" });
  const [isCloning, setIsCloning] = useState(false);
  const [clonePlanId, setClonePlanId] = useState(null);

  // Status toggle state
  const [isStatusToggling, setIsStatusToggling] = useState(false);

  const pageSize = 10;

  // Fetch plans
  const { data, isLoading, error } = useQuery({
    queryKey: ["plans", currentPage, searchText, statusFilter],
    queryFn: async () => {
      return await PlanServices.getAllPlans({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter,
        sort: "-createdAt",
      });
    },
  });

  const plans = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(plans.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleCloneClick = (planId) => {
    const plan = plans.find((p) => p._id === planId);
    if (!plan) return;
    setClonePlanId(plan._id);
    setCloneData({
      name: `Copie de ${plan.name}`,
      slug: `${plan.slug}-copy`,
    });
    setIsCloneModalOpen(true);
  };

  const handleCloneConfirm = async () => {
    if (!clonePlanId) return;
    try {
      setIsCloning(true);
      const clonedPlan = await PlanServices.clonePlan(clonePlanId, cloneData);
      successMessage(t("PlanCloneSuccess"));
      setIsCloneModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      if (clonedPlan?.data?._id) {
        setServiceId(clonedPlan.data._id);
        toggleDrawer();
      }
    } catch (err) {
      errorMessage(err?.response?.data?.message || t("PlanCloneFailed"));
    } finally {
      setIsCloning(false);
    }
  };

  const handleStatusToggle = async (planId, newStatus) => {
    try {
      setIsStatusToggling(true);
      await PlanServices.updatePlanStatus(planId, newStatus);
      successMessage(t("PlanStatusUpdated", { status: newStatus }));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || t("PlanStatusUpdateFailed")
      );
    } finally {
      setIsStatusToggling(false);
    }
  };

  const handleChangePage = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      <PageTitle>{t("PlansPageTitle")}</PageTitle>

      <MainDrawer>
        <PlanDrawer id={serviceId} />
      </MainDrawer>
      <DeleteModal id={serviceId} title={title} />

      <ClonePlanModal
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        cloneData={cloneData}
        setCloneData={setCloneData}
        onConfirm={handleCloneConfirm}
        isCloning={isCloning}
      />

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSearchSubmit}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchPlan")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus")}</option>
                  <option value="draft">{t("Draft")}</option>
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                  <option value="archived">{t("Archived")}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("Filter")}
                  </Button>
                </div>

                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleReset}
                    type="button"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">
                      {t("Reset")}
                    </span>
                  </Button>
                </div>

                {canCreatePlan && (
                  <div className="w-full mx-1">
                    <Button
                      onClick={() => {
                        setServiceId(undefined);
                        toggleDrawer();
                      }}
                      className="h-12 w-full rounded-md whitespace-nowrap"
                    >
                      <span className="mr-2">
                        <FiPlus />
                      </span>
                      {t("AddPlan")}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {isLoading ? (
        <TableLoading row={12} col={8} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </span>
      ) : plans?.length !== 0 ? (
        <TableContainer className="mb-8 overflow-x-auto">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    handleClick={handleSelectAll}
                    isChecked={isCheckAll}
                  />
                </TableCell>
                 <TableCell>{t("PlanName")}</TableCell>
                  <TableCell>{t("PlanBadge") || "Badge"}</TableCell>
                  <TableCell>{t("PlanColor") || "Color"}</TableCell>
                  <TableCell>{t("Version") || "Version"}</TableCell>
                  <TableCell>{t("MonthlyPrice")}</TableCell>
                  <TableCell>{t("YearlyPrice")}</TableCell>
                  <TableCell>{t("Currency")}</TableCell>
                  <TableCell>{t("PlanTrialDays") || "Trial"}</TableCell>
                 <TableCell className="text-center">{t("Status")}</TableCell>
                 <TableCell>{t("Stores")}</TableCell>
                 <TableCell>{t("CreatedDate")}</TableCell>
                 <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <PlanTable
              isCheck={isCheck}
              plans={plans}
              setIsCheck={setIsCheck}
              onClone={handleCloneClick}
              onStatusToggle={handleStatusToggle}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={pagination.total || 0}
              resultsPerPage={pageSize}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("NoPlans") || "Sorry, There are no plans right now."} />
      )}
    </>
  );
};

export default Plans;
