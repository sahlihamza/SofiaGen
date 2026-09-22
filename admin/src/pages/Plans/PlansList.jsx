import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableCell, TableContainer, TableHeader, TableRow, Pagination, Card, CardBody, Input, Select, Option } from "@windmill/react-ui";
import { FiSearch, FiPlus, FiEdit, FiCopy, FiTrash2 } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import useFilter from "@/hooks/useFilter";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import DeleteModal from "@/components/modal/DeleteModal";
import planAPI from "@/services/api/planAPI";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const PlansList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const { currentPage, handleChangePage, searchText, setSearchText, statusFilter, setStatusFilter } = useFilter();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState(null);

  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["platformPlans", currentPage, searchText, statusFilter],
    queryFn: async () => {
      const res = await planAPI.getAllPlans({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        status: statusFilter,
      });
      return res;
    },
  });

  const plans = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 1 };

  const handleDelete = async (planId) => {
    try {
      await planAPI.deletePlan(planId);
      queryClient.invalidateQueries(["platformPlans"]);
      successMessage(t("PlanDeletedSuccess"));
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleteModalOpen(false);
      setDeletePlanId(null);
    }
  };

  return (
    <div className="mx-auto w-full">
      <PageTitle>{t("PlansManagement")}</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                {t("AllPlans")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder={t("SearchPlans")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full md:w-64"
              />
              <Button icon={FiPlus}>{t("CreatePlan")}</Button>
            </div>
          </div>

          {isLoading ? (
            <TableLoading row={10} col={6} />
          ) : error ? (
            <NotFound title="Error loading plans" />
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHeader>
                    <tr>
<TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("Description")}</TableCell>
                      <TableCell>{t("Status")}</TableCell>
                      <TableCell>{t("PlanVisibility")}</TableCell>
                      <TableCell>{t("Price")}</TableCell>
                      <TableCell>{t("Subscriptions")}</TableCell>
                      <TableCell>{t("Actions")}</TableCell>
                    </tr>
                  </TableHeader>
                  <tbody>
                    {plans.map((plan) => (
                      <TableRow key={plan._id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{plan.description || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              plan.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : plan.status === "inactive"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </TableCell>
<TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              plan.visibility === "public"
                                ? "bg-emerald-100 text-emerald-800"
                                : plan.visibility === "private"
                                ? "bg-amber-100 text-amber-800"
                                : plan.visibility === "deprecated"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {plan.visibility || "public"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {plan.pricing?.monthly
                            ? `${plan.pricing.monthly} ${plan.pricing.currency || "USD"}`
                            : "-"}
                        </TableCell>
                        <TableCell>{plan.subscriptionCount || 0}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/billing/plans/${plan._id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <FiEdit />
                            </Link>
                            <Button
                              onClick={() => {
                                setDeletePlanId(plan._id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </TableContainer>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {t("Showing")} {plans.length} {t("Of")} {pagination.total}
                </span>
                <Pagination
                  totalResults={pagination.total || 0}
                  resultsPerPage={pageSize}
                  onChange={(page) => handleChangePage(page)}
                  label="Table navigation"
                />
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePlanId(null);
        }}
        onDelete={() => handleDelete(deletePlanId)}
        title={t("DeletePlan")}
        message={t("DeletePlanConfirm")}
      />
    </div>
  );
};

export default PlansList;