import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Modal, ModalBody, ModalFooter, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { FiExternalLink, FiXCircle } from "react-icons/fi";
import AnimatedContent from "@/components/common/AnimatedContent";
import PageTitle from "@/components/Typography/PageTitle";
import PlanServices from "@/services/PlanServices";
import ActionMenu from "@/components/table/ActionMenu";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const Subscriptions = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [targetPlanId, setTargetPlanId] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions-overview", currentPage, statusFilter, searchText],
    queryFn: () =>
      PlanServices.getAllSubscriptions({
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        search: searchText,
        sort: "-createdAt",
      }),
  });

  const subscriptions = data?.data || [];
  const pagination = data?.pagination || {};

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["active-plans"],
    queryFn: () => PlanServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];
  const selectedTargetPlan = plans.find((plan) => plan._id === targetPlanId);

  const handleSuspend = async (subscriptionId) => {
    try {
      await PlanServices.suspendSubscription(subscriptionId);
      successMessage(t("SubscriptionSuspended") || "Subscription suspended successfully");
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || String(err));
    }
  };

  const handleCancel = async (subscription) => {
    try {
      await PlanServices.cancelSubscription(subscription._id);
      successMessage(t("SubscriptionCanceled") || "Subscription canceled successfully");
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || String(err));
    }
  };

  const handleOpenChangePlan = (subscription, action) => {
    setSelectedSubscription(subscription);
    setSelectedAction(action);
    setTargetPlanId("");
    setIsActionModalOpen(true);
  };

  const handleChangePlan = async () => {
    if (!selectedSubscription || !targetPlanId) {
      errorMessage(t("SelectTargetPlan") || "Please select a target plan.");
      return;
    }

    const body = {
      targetPlanId,
      billingCycle: selectedSubscription.billingCycle,
      startDate: new Date().toISOString(),
    };

    setIsSubmittingAction(true);
    try {
      if (selectedAction === "upgrade") {
        await PlanServices.upgradeSubscription(selectedSubscription._id, body);
        successMessage(t("SubscriptionUpgraded") || "Subscription upgraded successfully");
      } else {
        await PlanServices.downgradeSubscription(selectedSubscription._id, body);
        successMessage(t("SubscriptionDowngraded") || "Subscription downgraded successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      setIsActionModalOpen(false);
      setSelectedSubscription(null);
      setSelectedAction("");
      setTargetPlanId("");
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || String(err));
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <>
      <PageTitle>{t("SubscriptionsPageTitle") || "Subscriptions"}</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("SubscriptionsOverviewTitle") || "Subscription overview"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("SubscriptionsOverviewMessage") ||
                    "Browse the currently active subscriptions across all plans."}
                </p>
                {pagination.total !== undefined && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t("ShowingResults") || "Showing"} {subscriptions.length} / {pagination.total} {t("results") || "results"}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="search"
                  placeholder={t("Search") || "Search"}
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="min-w-[220px]"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus") || "All status"}</option>
                  <option value="trial">{t("subscriptionStatus.trial") || "Trial"}</option>
                  <option value="active">{t("subscriptionStatus.active") || "Active"}</option>
                  <option value="past_due">{t("subscriptionStatus.past_due") || "Past due"}</option>
                  <option value="suspended">{t("subscriptionStatus.suspended") || "Suspended"}</option>
                  <option value="canceled">{t("subscriptionStatus.canceled") || t("subscriptionStatus.cancelled") || "Cancelled"}</option>
                  <option value="expired">{t("subscriptionStatus.expired") || "Expired"}</option>
                </select>

                <Button
                  layout="outline"
                  type="button"
                  onClick={() => {
                    setSearchText("");
                    setStatusFilter("");
                    setCurrentPage(1);
                  }}
                >
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500">{t("Loading")}</p>
            ) : error ? (
              <p className="text-sm text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </p>
            ) : subscriptions.length > 0 ? (
              <>
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>{t("Store") || "Store"}</TableCell>
                        <TableCell>{t("Plan") || "Plan"}</TableCell>
                        <TableCell>{t("Status")}</TableCell>
                        <TableCell>{t("BillingCycle") || "Cycle"}</TableCell>
                        <TableCell>{t("Amount") || "Amount"}</TableCell>
                        <TableCell>{t("NextBilling") || "Next Billing"}</TableCell>
                        <TableCell>{t("Actions") || "Actions"}</TableCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription) => (
                        <TableRow key={subscription._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {subscription.storeId?.name || "-"}
                              </span>
                              {subscription.storeId?._id && (
                                <Button
                                  type="button"
                                  onClick={() => history.push(`/store/${subscription.storeId._id}`)}
                                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  {t("View") || "View"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {subscription.planId?.name || "-"}
                              </span>
                              {subscription.planId?._id && (
                                <Button
                                  type="button"
                                  onClick={() => history.push(`/plans/${subscription.planId._id}`)}
                                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  {t("View") || "View"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                           <Badge
                             type={
                               subscription.status === "trial"
                                 ? "info"
                                 : subscription.status === "active"
                                 ? "success"
                                 : subscription.status === "past_due"
                                 ? "warning"
                                 : subscription.status === "suspended"
                                 ? "secondary"
                                 : subscription.status === "canceled"
                                 ? "danger"
                                 : subscription.status === "expired"
                                 ? "neutral"
                                 : "gray"
                             }
                           >
                             {t(`subscriptionStatus.${subscription.status}`) || subscription.status}
                           </Badge>
                          </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {subscription.billingCycle === "yearly"
                                  ? t("Yearly")
                                  : t("Monthly")}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {subscription.priceSnapshot?.monthly
                                  ? `${subscription.priceSnapshot.monthly} ${subscription.priceSnapshot?.currency || "USD"}`
                                  : "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {subscription.nextBillingDate
                                  ? new Date(subscription.nextBillingDate).toLocaleDateString()
                                  : "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-center">
                                <ActionMenu
                                  id={subscription._id}
                                  title={subscription.storeId?.name || subscription.planId?.name || t("Subscription")}
                                  isCheck={[]}
                                  handleUpdate={() => {
                                    if (subscription.planId?._id) {
                                      history.push(`/plans/${subscription.planId._id}`);
                                    }
                                  }}
                                  handleModalOpen={() => {
                                    if (subscription.storeId?._id) {
                                      history.push(`/store/${subscription.storeId._id}`);
                                    }
                                  }}
                                  showEdit={!!subscription.planId?._id}
                                  showDelete={false}
                                  extraActions={[
                                    {
                                      key: "upgrade",
                                      Icon: FiExternalLink,
                                      label: t("Upgrade") || "Upgrade",
                                      className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
                                      onClick: () => handleOpenChangePlan(subscription, "upgrade"),
                                    },
                                    {
                                      key: "downgrade",
                                      Icon: FiExternalLink,
                                      label: t("Downgrade") || "Downgrade",
                                      className: "text-gray-500 dark:text-gray-400 hover:text-orange-600",
                                      onClick: () => handleOpenChangePlan(subscription, "downgrade"),
                                    },
                                    {
                                      key: "suspend",
                                      Icon: FiExternalLink,
                                      label: t("Suspend") || "Suspend",
                                      className: "text-gray-500 dark:text-gray-400 hover:text-red-600",
                                      onClick: () => handleSuspend(subscription._id),
                                      show: subscription.status !== "canceled" && subscription.status !== "cancelled" && subscription.status !== "expired",
                                    },
                                    {
                                      key: "cancel",
                                      Icon: FiXCircle,
                                      label: t("Cancel") || "Cancel",
                                      className: "text-gray-500 dark:text-gray-400 hover:text-red-600",
                                      onClick: () => handleCancel(subscription),
                                      show: subscription.status !== "canceled" && subscription.status !== "cancelled" && subscription.status !== "expired",
                                    },
                                  ]}
                                />
                              </div>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {pagination.pages > 1 && (
                  <div className="mt-4 flex justify-end">
                    <Pagination
                      totalResults={pagination.total || 0}
                      resultsPerPage={pagination.limit || pageSize}
                      onChange={setCurrentPage}
                      label="Page navigation"
                    />
                  </div>
                )}
                <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)}>
                  <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
                    <h2 className="text-xl font-medium mb-2">
                      {selectedAction === "upgrade"
                        ? t("UpgradeSubscription") || "Upgrade subscription"
                        : t("DowngradeSubscription") || "Downgrade subscription"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {t("ChooseTargetPlanMessage") || "Select the target plan for this subscription."}
                    </p>
                    <div className="space-y-3">
                      <div className="text-left">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          {t("TargetPlan") || "Target plan"}
                        </label>
                        <Select
                          value={targetPlanId}
                          onChange={(e) => setTargetPlanId(e.target.value)}
                          className="w-full"
                          disabled={plansLoading}
                        >
                          <option value="">{t("SelectPlan") || "Select a plan"}</option>
                          {plans
                            .filter((plan) => plan._id !== selectedSubscription?.planId?._id)
                            .map((plan) => (
                              <option key={plan._id} value={plan._id}>
                                {plan.name} {plan.pricing?.monthly ? `- ${plan.pricing.monthly} ${plan.pricing.currency || "USD"}` : ""}
                              </option>
                            ))}
                        </Select>
                      </div>
                      {selectedTargetPlan && (
                        <div className="rounded border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <div className="font-semibold mb-2">
                            {t("SelectedPlan") || "Selected plan"}
                          </div>
                          <div>
                            <span className="font-medium">{selectedTargetPlan.name}</span>
                            {selectedTargetPlan.pricing?.monthly && (
                              <span className="ml-2 text-gray-500">
                                {`${selectedTargetPlan.pricing.monthly} ${selectedTargetPlan.pricing.currency || "USD"} / ${selectedTargetPlan.pricing.yearly ? "monthly" : ""}`}
                              </span>
                            )}
                          </div>
                          {selectedTargetPlan.description && (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {selectedTargetPlan.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </ModalBody>
                  <ModalFooter className="justify-between gap-2">
                    <Button layout="outline" onClick={() => setIsActionModalOpen(false)}>
                      {t("CancelBtn") || "Cancel"}
                    </Button>
                    <Button onClick={handleChangePlan} disabled={isSubmittingAction || plansLoading}>
                      {isSubmittingAction
                        ? t("Processing") || "Processing"
                        : selectedAction === "upgrade"
                        ? t("Upgrade") || "Upgrade"
                        : t("Downgrade") || "Downgrade"}
                    </Button>
                  </ModalFooter>
                </Modal>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {t("NoSubscriptions") || "No subscriptions found."}
              </div>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default Subscriptions;
