import { Card, CardBody, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import PlanPriceServices from "@/services/PlanPriceServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlanPriceDrawer from "@/components/drawer/PlanPriceDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const cycleMap = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Semi-Annual",
  yearly: "Yearly",
  custom: "Custom",
};

const statusBadge = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.draft;
};

const PlanPrices = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreate = hasPermission("billing", "create") || hasPermission("platform", "create");
  const canUpdate = hasPermission("billing", "update");
  const canDelete = hasPermission("billing", "delete");

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-prices", currentPage, searchText, statusFilter, currencyFilter, cycleFilter],
    queryFn: async () => {
      return await PlanPriceServices.getAllPlanPrices({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter,
        currency: currencyFilter,
        cycle: cycleFilter,
        sort: "-createdAt",
      });
    },
  });

  const prices = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(prices.map((li) => li._id));
    if (isCheckAll) setIsCheck([]);
  };

  const handleReset = () => {
    setSearchText("");
    setStatusFilter("");
    setCurrencyFilter("");
    setCycleFilter("");
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await PlanPriceServices.deletePlanPrice(id);
      successMessage(t("PlanPriceDeleteSuccess") || "Plan price deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["plan-prices"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to delete plan price");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  const handleChangePage = (page) => setCurrentPage(page);

  return (
    <>
      <PageTitle>{t("PlanPricesPageTitle") || "Plan Prices"}</PageTitle>

      <MainDrawer>
        <PlanPriceDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setCurrentPage(1);
              }}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchPlanPrice") || "Search by currency or cycle"}
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
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllCurrencies") || "All Currencies"}</option>
                  {["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "ZAR", "TND", "EGP"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllCycles") || "All Cycles"}</option>
                  {Object.entries(cycleMap).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
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
                    className="px-4 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">
                      {t("Reset")}
                    </span>
                  </Button>
                </div>
                {canCreate && (
                  <div className="w-full mx-1">
                    <Button
                      onClick={() => {
                        setServiceId(undefined);
                        toggleDrawer();
                      }}
                      className="h-12 w-full rounded-md whitespace-nowrap"
                    >
                      <span className="mr-2 flex items-center"><FiPlus /></span>
                      {t("AddPlanPrice") || "Add Plan Price"}
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
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : prices?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox type="checkbox" name="selectAll" id="selectAll"
                    handleClick={handleSelectAll} isChecked={isCheckAll} />
                </TableCell>
                <TableCell>{t("Plan")}</TableCell>
                <TableCell>{t("Currency")}</TableCell>
                <TableCell>{t("Cycle")}</TableCell>
                <TableCell>{t("Price")}</TableCell>
                <TableCell>{t("SetupFee") || "Setup Fee"}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell>{t("EffectiveFrom") || "From"}</TableCell>
                <TableCell>{t("EffectiveTo") || "To"}</TableCell>
                <TableCell>{t("Default") || "Default"}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {prices.map((p) => (
                <TableRow key={p._id}>
                  <TableCell>
                    <CheckBox type="checkbox" name={p._id} id={p._id}
                      handleClick={(e) => {
                        const { id, checked } = e.target;
                        setIsCheck(checked ? [...isCheck, id] : isCheck.filter((item) => item !== id));
                      }}
                      isChecked={isCheck?.includes(p._id)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{p.planId?.name || "â€”"}</span>

                  </TableCell>
                  <TableCell><span className="text-sm">{p.currency}</span></TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{cycleMap[p.cycle] || p.cycle}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold">
                      {formatMoney(Number(p.price), p.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {p.setupFee ? formatMoney(Number(p.setupFee), p.currency) : "â€”"}

                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {p.effectiveFrom ? dayjs(p.effectiveFrom).format("DD/MM/YYYY") : "â€”"}

                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {p.effectiveTo ? dayjs(p.effectiveTo).format("DD/MM/YYYY") : "âˆž"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{p.isDefault ? "âœ“" : "â€”"}</span>

                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center">
                      <ActionMenu
                        id={p._id}
                        title={`${p.currency} ${p.cycle}`}
                        isCheck={isCheck}
                        handleUpdate={canUpdate ? handleUpdate : undefined}
                        handleModalOpen={
                          canDelete
                            ? (id, title) => {
                                setServiceId(id);
                                handleDelete(id);
                              }
                            : undefined
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
        <NotFound title={t("NoPlanPrices") || "Sorry, There are no plan prices right now."} />
      )}
    </>
  );
};

export default PlanPrices;
