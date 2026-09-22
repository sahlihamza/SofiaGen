import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Badge } from "@windmill/react-ui";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import PlanServices from "@/services/PlanServices";
import FeatureServices from "@/services/FeatureServices";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import PlanHistoryTimeline from "@/components/plan/PlanHistoryTimeline";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import DeleteModal from "@/components/modal/DeleteModal";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const TABS = ["General", "Pricing", "Features", "Quotas", "Subscriptions", "History", "Audit"];

const showDateFormat = (dateStr) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PlanDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("General");
  const [isEditing, setIsEditing] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    description: "",
    badge: "",
    color: "",
    icon: "",
    pricing: { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false },
features: {},
    limits: {},
    status: "draft",
    visibility: "public",
  });
  const canUpdatePlan = hasPermission("plans", "update");
  const canDeletePlan = hasPermission("plans", "delete");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState(null);

  const { data: plan, isLoading: planLoading, refetch } = useQuery({
    queryKey: ["plan", id],
    queryFn: () => PlanServices.getPlanById(id),
  });

  const handleEditClick = () => {
    const p = plan?.data?.data || plan?.data;
    if (p) {
      const pricing = p.pricing || { monthly: 0, yearly: 0, currency: "USD", taxIncluded: false };
      const features = p.features
        ? Object.fromEntries(
            Object.entries(p.features).map(([k, v]) => [k, Boolean(v)])
          )
        : {};
      const limits = p.limits
        ? Object.fromEntries(
            Object.entries(p.limits).map(([k, v]) => [k, v ?? null])
          )
        : {};
      setEditForm({
        name: p.name || "",
        slug: p.slug || "",
        description: p.description || "",
        badge: p.badge || "",
        color: p.color || "",
        icon: p.icon || "",
        pricing,
features,
        limits,
        status: p.status || "draft",
        visibility: p.visibility || "public",
      });
    }
    setIsEditing(true);
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSubmit = async () => {
    try {
      const body = {
        ...editForm,
        features: editForm.features,
        limits: editForm.limits,
      };
      await PlanServices.updatePlan(id, body);
      successMessage(t("PlanUpdated") || "Plan updated successfully");
      setIsEditing(false);
      refetch();
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || t("PlanUpdateFailed") || "Failed to update plan"
      );
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await PlanServices.deletePlan(deletePlanId);
      queryClient.invalidateQueries(["plan", id]);
      successMessage(t("PlanDeletedSuccess") || "Plan deleted successfully");
      history.push("/billing/plans");
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleteModalOpen(false);
      setDeletePlanId(null);
    }
  };

  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ["plan-subscriptions", id],
    queryFn: () => PlanServices.getPlanSubscriptions(id),
    enabled: activeTab === "Subscriptions",
  });

  const { data: subsSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["plan-subs-summary", id],
    queryFn: () => PlanServices.getPlanSubscriptionsSummary(id),
    enabled: activeTab === "Subscriptions",
  });

  const { data: auditLog, isLoading: logLoading } = useQuery({
    queryKey: ["plan-audit-log", id],
    queryFn: () => PlanServices.getPlanAuditLog(id),
    enabled: activeTab === "History",
  });

  const { data: quotaTypesResponse } = useQuery({
    queryKey: ["quota-types", "plan-detail"],
    queryFn: () => QuotaTypeServices.getAllQuotaTypes({ limit: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: featuresResponse, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", "plan-detail"],
    queryFn: () => FeatureServices.getAllFeatures(),
    staleTime: 1000 * 60 * 5,
  });

  const allFeatures = featuresResponse?.data || [];
  const activeFeatures = allFeatures.filter((f) => f.status === "active");

  const handleFeatureToggle = (featureCode) => {
    setEditForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureCode]: !Boolean(prev.features?.[featureCode]),
      },
    }));
  };

  const handlePlanFeatureToggle = async (featureCode) => {
    if (!planData?._id) return;
    setTogglingFeature(featureCode);
    try {
      const currentValue = Boolean(planData.features?.[featureCode]);
      const updatedFeatures = {
        ...planData.features,
        [featureCode]: !currentValue,
      };
      await PlanServices.updatePlan(planData._id, {
        ...planData,
        features: updatedFeatures,
      });
      successMessage(t("FeatureToggleSuccess") || "Feature toggled successfully");
      queryClient.invalidateQueries({ queryKey: ["plan", id] });
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || t("FeatureToggleFailed") || "Failed to toggle feature"
      );
    } finally {
      setTogglingFeature(null);
    }
  };

  const planData = plan?.data;
  const subsData = subscriptions?.data || [];
  const summaryData = subsSummary?.data;
  const logData = auditLog?.data || [];

  if (planLoading) {
    return (
      <div className="px-6 py-16 lg:py-20 h-screen flex flex-wrap content-center">
        <div className="block justify-items-stretch mx-auto items-center text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("Loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="px-6 py-16 lg:py-20 h-screen flex flex-wrap content-center">
        <div className="block justify-items-stretch mx-auto items-center text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("PlanNotFound") || "Plan not found."}
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const config = {
      draft: { type: "warning", label: t("Draft") },
      active: { type: "success", label: t("Active") },
      inactive: { type: "danger", label: t("Inactive") },
      archived: { type: "gray", label: t("Archived") },
    };
    return <Badge type={config[status]?.type || "gray"}>{config[status]?.label || status}</Badge>;
  };

  const getSummaryCount = (status) => {
    if (!summaryData?.byStatus) return 0;
    const item = summaryData.byStatus.find((s) => s.status === status);
    return item?.count || 0;
  };

  const getQuotaLabel = (code) => {
    const found = quotaTypesResponse?.data?.data?.find((quota) => quota.code === code);
    return found?.name || code;
  };

  const getQuotaUnit = (code) => {
    const found = quotaTypesResponse?.data?.data?.find((quota) => quota.code === code);
    return found?.unit;
  };

  const formatQuotaValue = (value, unit) => {
    if (value === null || value === undefined) return null;
    if (unit === "gb") return `${value} GB`;
    if (unit === "mb") return `${value} MB`;
    if (unit === "days") return `${value} days`;
    return value;
  };

  return (
    <>
      <PageTitle>{t("PlanDetailTitle") || `Plan: ${planData.name}`}</PageTitle>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {planData.name}
              </h3>
              <div className="flex items-center gap-2">
                {getStatusBadge(planData.status)}
                {canUpdatePlan && (
                  <Button
                    layout="outline"
                    size="small"
                    onClick={handleEditClick}
                    className="text-sm"
                  >
                    <FiEdit className="mr-1" />
                    {t("EditPlan") || "Edit Plan"}
                  </Button>
                )}
                {canDeletePlan && (
                  <Button
                    layout="outline"
                    size="small"
                    onClick={() => {
                      setDeletePlanId(planData._id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-sm text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
                  >
                    <FiTrash2 className="mr-1" />
                    {t("DeletePlan")}
                  </Button>
                )}
              </div>
            </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                   {t("PlanSlug") || "Slug"}
                 </p>
                 <p className="text-sm font-medium">{planData.slug}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                   {t("Version") || "Version"}
                 </p>
                 <p className="text-sm font-medium">v{planData.version || 1}</p>
               </div>
               <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                   {t("MonthlyPrice") || "Monthly"}
                 </p>
                  <p className="text-sm font-medium">
                    {formatMoney(planData.pricing?.monthly, planData.pricing?.currency)}
                  </p>
                </div>
               <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("YearlyPrice") || "Yearly"}
                  </p>
                  <p className="text-sm font-medium">
                    {formatMoney(planData.pricing?.yearly, planData.pricing?.currency)}
                  </p>
                </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("Stores") || "Stores"}
                </p>
                <p className="text-sm font-medium">
                  {planData.storesCount || 0}
                </p>
              </div>
            </div>

            {planData.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {planData.description}
              </p>
            )}

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
              {TABS.map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {t(tab) || tab}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        {activeTab === "General" && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("PlanSlug") || "Slug"}
                  </p>
                  <p className="text-sm font-medium">{planData.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("Stores") || "Stores"}
                  </p>
                  <p className="text-sm font-medium">
                    {planData.storesCount || 0}
                  </p>
                </div>
<div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("Status") || "Status"}
                  </p>
                  <p className="text-sm font-medium">
                    {getStatusBadge(planData.status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("PlanVisibility") || "Visibility"}
                  </p>
                  <p className="text-sm font-medium">
                    <Badge type={
                      planData.visibility === "public"
                        ? "success"
                        : planData.visibility === "private"
                        ? "warning"
                        : planData.visibility === "deprecated"
                        ? "danger"
                        : "gray"
                    }>
                      {planData.visibility || "public"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("CreatedAt") || "Created"}
                  </p>
                  <p className="text-sm font-medium">
                    {planData.createdAt
                      ? new Date(planData.createdAt).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </div>

              {planData.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {planData.description}
                </p>
              )}

              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
{t("PlanFeatures") || "Features"}
               </h4>
               {planData.features && Object.keys(planData.features).length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {Object.entries(planData.features).map(([key, value]) => {
                     const feature = allFeatures.find((f) => f.code === key);
                     return (
                       <Badge key={key} type={value ? "success" : "gray"}>
                         {feature?.name || key}: {value ? "Yes" : "No"}
                       </Badge>
                     );
                   })}
                 </div>
               ) : (
                 <p className="text-sm text-gray-500">
                   {t("NoFeatures") || "No features configured."}
                 </p>
               )}
            </CardBody>
          </Card>
        )}

        {activeTab === "Pricing" && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t("Pricing") || "Pricing"}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("MonthlyPrice") || "Monthly"}
                  </p>
                   <p className="text-sm font-medium">
                     {formatMoney(planData.pricing?.monthly, planData.pricing?.currency)}
                   </p>
                 </div>
                 <div>
                   <p className="text-xs text-gray-500 dark:text-gray-400">
                     {t("YearlyPrice") || "Yearly"}
                   </p>
                   <p className="text-sm font-medium">
                     {formatMoney(planData.pricing?.yearly, planData.pricing?.currency)}
                   </p>
                 </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("Currency") || "Currency"}
                  </p>
                  <p className="text-sm font-medium">
                    {planData.pricing?.currency || "USD"}
                  </p>
                </div>
              </div>
              {planData.pricing?.taxIncluded && (
                <p className="text-sm text-gray-500 mt-2">
                  {t("TaxIncluded") || "Tax included"}
                </p>
              )}
            </CardBody>
          </Card>
        )}

{activeTab === "Features" && (
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
              <CardBody>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t("PlanFeatures") || "Features"}
                </h4>
                {planData.features && Object.keys(planData.features).length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <tr>
                            <TableCell>{t("Feature") || "Feature"}</TableCell>
                            <TableCell>{t("Status") || "Status"}</TableCell>
                          </tr>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(planData.features).map(([key, value]) => {
                            const feature = allFeatures.find((f) => f.code === key);
                            const isToggling = togglingFeature === key;
                            return (
                              <TableRow key={key}>
                                <TableCell>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {feature?.name || key}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {isToggling ? (
                                    <span className="text-sm text-gray-500">
                                      {t("Loading") || "Loading..."}
                                    </span>
                                  ) : (
                                    <SwitchToggle
                                      processOption={Boolean(value)}
                                      handleProcess={() => handlePlanFeatureToggle(key)}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t("NoFeatures") || "No features configured."}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

        {activeTab === "Quotas" && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t("PlanQuotas") || "Quotas"}
              </h4>
              {planData.limits && Object.keys(planData.limits).length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <tr>
                          <TableCell>{t("Quota") || "Quota"}</TableCell>
                          <TableCell>{t("Limit") || "Limit"}</TableCell>
                          <TableCell>{t("Status") || "Status"}</TableCell>
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(planData.limits).map(([key, value]) => {
                          const isUnlimited = value === null || value === undefined;
                          return (
                            <TableRow key={key}>
                              <TableCell>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {getQuotaLabel(key)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {isUnlimited
                                    ? t("Unlimited") || "Unlimited"
                                    : formatQuotaValue(value, getQuotaUnit(key))}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge type={isUnlimited ? "gray" : "success"}>
                                  {isUnlimited ? t("Unlimited") || "Unlimited" : t("Limited") || "Limited"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("NoQuotas") || "No quotas configured."}
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === "Subscriptions" && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              {summaryLoading ? (
                <p className="text-sm text-gray-500">{t("Loading")}</p>
              ) : summaryData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("TotalSubscriptions") || "Total Subscriptions"}
                    </p>
                    <p className="text-lg font-semibold">
                      {summaryData.total || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("ActiveSubscriptions") || "Active"}
                    </p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {getSummaryCount("active")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("InactiveSubscriptions") || "Inactive"}
                    </p>
                    <p className="text-lg font-semibold text-red-600">
                      {getSummaryCount("inactive")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("TrialingSubscriptions") || "Trialing"}
                    </p>
                    <p className="text-lg font-semibold text-blue-600">
                      {getSummaryCount("trial")}
                    </p>
                  </div>
                </div>
              ) : null}

              {subsLoading ? (
                <p className="text-sm text-gray-500">{t("Loading")}</p>
              ) : subsData.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>{t("Store") || "Store"}</TableCell>
                        <TableCell>{t("Owner") || "Owner"}</TableCell>
                        <TableCell>{t("BillingCycle") || "Cycle"}</TableCell>
                        <TableCell>{t("Status")}</TableCell>
                        <TableCell>{t("NextBilling") || "Next Billing"}</TableCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {subsData.map((sub, i) => (
                        <TableRow key={i + 1}>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {sub.storeId?.name || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {sub.storeId?.owner?.name || sub.storeId?.owner?.email || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {sub.billingCycle === "yearly" ? "Yearly" : "Monthly"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              type={
                                sub.status === "active"
                                  ? "success"
                                  : sub.status === "trial"
                                  ? "info"
                                  : "gray"
                              }
                            >
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {sub.nextBillingDate
                                ? new Date(sub.nextBillingDate).toLocaleDateString()
                                : "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("NoSubscriptions") || "No subscriptions found."}
                </p>
              )}
            </CardBody>
          </Card>
        )}

          {activeTab === "History" && (
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
              <CardBody>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  {t("PricingHistory") || "Pricing History"}
                </h4>
                {planData.pricingHistory && planData.pricingHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <TableContainer>
                      <Table>
                        <TableHeader>
                          <tr>
                            <TableCell>{t("Version") || "Version"}</TableCell>
                            <TableCell>{t("MonthlyPrice") || "Monthly"}</TableCell>
                            <TableCell>{t("YearlyPrice") || "Yearly"}</TableCell>
                            <TableCell>{t("Currency") || "Currency"}</TableCell>
                            <TableCell>{t("TaxIncluded") || "Tax Included"}</TableCell>
                            <TableCell>{t("TrialDays") || "Trial Days"}</TableCell>
                            <TableCell>{t("EffectiveFrom") || "Effective From"}</TableCell>
                            <TableCell>{t("EffectiveTo") || "Effective To"}</TableCell>
                            <TableCell>{t("VersionNote") || "Version Note"}</TableCell>
                            <TableCell>{t("ChangeDescription") || "Description"}</TableCell>
                          </tr>
                        </TableHeader>
                        <TableBody>
                          {planData.pricingHistory.map((entry, idx) => (
                            <TableRow key={idx} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                              <TableCell className="font-medium text-gray-900 dark:text-white">
                                v{entry.version}
                              </TableCell>
                              <TableCell>
                                {formatMoney(entry.monthly, entry.currency)}
                              </TableCell>
                              <TableCell>
                                {formatMoney(entry.yearly, entry.currency)}
                              </TableCell>
                              <TableCell>{entry.currency}</TableCell>
                              <TableCell>
                                {entry.taxIncluded ? "Yes" : "No"}
                              </TableCell>
                              <TableCell>{entry.trialDays || 0}</TableCell>
                              <TableCell>{showDateFormat(entry.effectiveFrom)}</TableCell>
                              <TableCell>
                                {entry.effectiveTo
                                  ? showDateFormat(entry.effectiveTo)
                                  : t("Current") || "Current"}
                              </TableCell>
                              <TableCell className="text-xs max-w-xs truncate">
                                {entry.versionNote || "-"}
                              </TableCell>
                              <TableCell className="text-xs max-w-xs truncate">
                                {entry.changeDescription || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {t("NoPricingHistory") || "No pricing history available"}
                  </p>
                )}
                <hr className="my-4 border-gray-200 dark:border-gray-700" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  {t("AuditTrail") || "Audit Trail"}
                </h4>
                <PlanHistoryTimeline logs={logData} />
              </CardBody>
            </Card>
          )}

         {activeTab === "Audit" && (
           <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
             <CardBody>
               <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                 {t("AuditLog") || "Audit Log"}
               </h4>
               {logLoading ? (
                 <p className="text-sm text-gray-500">{t("Loading")}</p>
               ) : logData.length > 0 ? (
                 <TableContainer>
                   <Table>
                     <TableHeader>
                       <tr>
                         <TableCell>{t("Action") || "Action"}</TableCell>
                         <TableCell>{t("Actor") || "Actor"}</TableCell>
                         <TableCell>{t("Summary") || "Summary"}</TableCell>
                         <TableCell>{t("Changes") || "Changes"}</TableCell>
                         <TableCell>{t("IPAddress") || "IP"}</TableCell>
                         <TableCell>{t("CreatedAt") || "Created At"}</TableCell>
                       </tr>
                     </TableHeader>
                     <TableBody>
                       {logData.map((entry) => (
                         <TableRow key={entry._id}>
                           <TableCell>
                             <Badge
                                type={
                                  entry.action === "create"
                                    ? "success"
                                    : entry.action === "update"
                                    ? "blue"
                                    : entry.action === "delete"
                                    ? "red"
                                    : entry.action === "clone"
                                    ? "gray"
                                    : "warning"
                                }
                              >
                                {entry.action}
                              </Badge>
                           </TableCell>
                           <TableCell>
                             <span className="text-sm">
                               {entry.userId?.name || entry.userId?.email || "-"}
                             </span>
                           </TableCell>
                           <TableCell className="text-sm">
                             {entry.summary || "-"}
                           </TableCell>
                           <TableCell className="max-w-xs truncate text-xs">
                             {entry.fieldChanges
                               ? JSON.stringify(entry.fieldChanges)
                               : "-"}
                           </TableCell>
                           <TableCell className="text-xs">
                             {entry.ipAddress || "-"}
                           </TableCell>
                           <TableCell className="text-xs">
                             {entry.createdAt
                               ? showDateFormat(entry.createdAt)
                               : "-"}
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
                 </TableContainer>
               ) : (
                 <p className="text-sm text-gray-500">
                   {t("NoAuditLogs") || "No audit logs found."}
                 </p>
               )}
             </CardBody>
           </Card>
         )}

        {isEditing && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {t("EditPlan") || "Edit Plan"}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("PlanName") || "Plan Name"}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("PlanSlug") || "Slug"}
                  </label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => handleEditChange("slug", e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("MonthlyPrice") || "Monthly Price"}
                  </label>
                  <input
                    type="number"
                    value={editForm.pricing?.monthly || 0}
                    onChange={(e) =>
                      handleEditChange("pricing", {
                        ...editForm.pricing,
                        monthly: Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("YearlyPrice") || "Yearly Price"}
                  </label>
                  <input
                    type="number"
                    value={editForm.pricing?.yearly || 0}
                    onChange={(e) =>
                      handleEditChange("pricing", {
                        ...editForm.pricing,
                        yearly: Number(e.target.value),
                      })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("Currency") || "Currency"}
                  </label>
                  <input
                    type="text"
                    value={editForm.pricing?.currency || "USD"}
                    onChange={(e) =>
                      handleEditChange("pricing", {
                        ...editForm.pricing,
                        currency: e.target.value,
                      })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("PlanFeatures") || "Features"}
                  </label>
                  {featuresLoading ? (
                    <p className="text-sm text-gray-500">{t("Loading")}</p>
                  ) : activeFeatures.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-700">
                      {activeFeatures.map((feature) => (
                        <div
                          key={feature.code}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {feature.name}
                          </span>
                          <SwitchToggle
                            processOption={Boolean(editForm.features?.[feature.code])}
                            handleProcess={() => handleFeatureToggle(feature.code)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {t("NoFeaturesFound") || "No features available."}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("Status") || "Status"}
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => handleEditChange("status", e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
<option value="draft">{t("Draft") || "Draft"}</option>
                    <option value="active">{t("Active") || "Active"}</option>
                    <option value="inactive">{t("Inactive") || "Inactive"}</option>
                    <option value="archived">{t("Archived") || "Archived"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("PlanVisibility") || "Visibility"}
                  </label>
                  <select
                    value={editForm.visibility}
                    onChange={(e) => handleEditChange("visibility", e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="public">{t("VisibilityPublic") || "Public"}</option>
                    <option value="private">{t("VisibilityPrivate") || "Private"}</option>
                    <option value="invitation">{t("VisibilityInvitation") || "Invitation"}</option>
                    <option value="internal">{t("VisibilityInternal") || "Internal"}</option>
                    <option value="deprecated">{t("VisibilityDeprecated") || "Deprecated"}</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  layout="outline"
                  onClick={handleCancelEdit}
                  type="button"
                >
                  {t("Cancel") || "Cancel"}
                </Button>
                <Button
                  onClick={handleEditSubmit}
                  type="button"
                  className="bg-emerald-700"
                >
                  {t("Save") || "Save"}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </AnimatedContent>

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePlanId(null);
        }}
        onDelete={handleDelete}
        title={t("DeletePlan")}
        message={t("DeletePlanConfirm")}
      />
    </>
  );
};

export default PlanDetail;
