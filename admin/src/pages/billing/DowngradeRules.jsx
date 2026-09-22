import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";
import dayjs from "dayjs";
import { FiPlus, FiEdit3, FiTrash2, FiCopy, FiEye, FiRefreshCw } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import PlanDowngradeRuleServices from "@/services/PlanDowngradeRuleServices";
import PlanServices from "@/services/PlanServices";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const policyBadge = (policy) => {
  const map = {
    refuse: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    require_deletion: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    read_only: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    grace_period: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    ok: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  };
  return map[policy] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const statusBadge = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.draft;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  fromPlanId: "",
  toPlanId: "",
  quotaExceedPolicy: "grace_period",
  graceDays: 7,
  requiresApproval: false,
  approvedByRole: "any",
  effectiveStrategy: "next_renewal",
  issueProratedCredit: true,
  preserveExcessData: true,
  minDaysOnPlan: 0,
  appliesTo: "all",
  status: "draft",
};

const DowngradeRules = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", status: "", fromPlanId: "", toPlanId: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);
  const [validate, setValidate] = useState({ subscriptionId: "", toPlanId: "" });
  const [validateResult, setValidateResult] = useState(null);

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");
  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");
  const canCreate = hasPermission("platform_plan", "create") || canEdit;
  const canDelete = hasPermission("platform_plan", "delete");

  const { data: plansData } = useQuery({
    queryKey: ["plans-active-list-dg"],
    queryFn: () => PlanServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];

  const { data: subsData } = useQuery({
    queryKey: ["subscriptions-list-dg"],
    queryFn: () => SubscriptionServices.getAllSubscriptions({ status: "active", limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const subscriptions = subsData?.data || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["downgrade-rules", filters, currentPage],
    queryFn: () =>
      PlanDowngradeRuleServices.getDowngradeRules({
        page: currentPage,
        limit: pageSize,
        search: filters.search,
        status: filters.status,
        fromPlanId: filters.fromPlanId,
        toPlanId: filters.toPlanId,
        sort: "-createdAt",
      }),
  });

  const rules = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? PlanDowngradeRuleServices.updateDowngradeRule(editing._id, payload)
        : PlanDowngradeRuleServices.createDowngradeRule(payload),
    onSuccess: () => {
      successMessage(t(editing ? "RuleUpdated" : "RuleCreated") || (editing ? "Downgrade rule updated" : "Downgrade rule created"));
      queryClient.invalidateQueries(["downgrade-rules"]);
      setDrawerOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Save failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => PlanDowngradeRuleServices.updateDowngradeRuleStatus(id, status),
    onSuccess: () => {
      successMessage(t("StatusUpdated") || "Status updated");
      queryClient.invalidateQueries(["downgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Status update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PlanDowngradeRuleServices.deleteDowngradeRule(id),
    onSuccess: () => {
      successMessage(t("RuleDeleted") || "Downgrade rule deleted");
      queryClient.invalidateQueries(["downgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Delete failed"),
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => PlanDowngradeRuleServices.cloneDowngradeRule(id),
    onSuccess: () => {
      successMessage(t("RuleCloned") || "Downgrade rule cloned");
      queryClient.invalidateQueries(["downgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Clone failed"),
  });

  const validateMutation = useMutation({
    mutationFn: () => PlanDowngradeRuleServices.validateDowngrade(validate),
    onSuccess: (res) => setValidateResult(res?.data || null),
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Validation failed"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      name: rule.name || "",
      description: rule.description || "",
      fromPlanId: rule.fromPlanId?._id || rule.fromPlanId || "",
      toPlanId: rule.toPlanId?._id || rule.toPlanId || "",
      quotaExceedPolicy: rule.quotaExceedPolicy || "grace_period",
      graceDays: rule.graceDays || 7,
      requiresApproval: !!rule.requiresApproval,
      approvedByRole: rule.approvedByRole || "any",
      effectiveStrategy: rule.effectiveStrategy || "next_renewal",
      issueProratedCredit: !!rule.issueProratedCredit,
      preserveExcessData: !!rule.preserveExcessData,
      minDaysOnPlan: rule.minDaysOnPlan || 0,
      appliesTo: rule.appliesTo || "all",
      status: rule.status || "draft",
    });
    setDrawerOpen(true);
  };

  const handleField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.fromPlanId || !form.toPlanId) {
      errorMessage(t("NameAndPlansRequired") || "Name, source and target plans are required");
      return;
    }
    if (form.fromPlanId === form.toPlanId) {
      errorMessage(t("PlansMustDiffer") || "Source and target plans must be different");
      return;
    }
    saveMutation.mutate({
      ...form,
      requiresApproval: !!form.requiresApproval,
      issueProratedCredit: !!form.issueProratedCredit,
      preserveExcessData: !!form.preserveExcessData,
    });
  };

  const handleDelete = (rule) => {
    const id = rule._id;
    deleteMutation.mutate(id);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ search: "", status: "", fromPlanId: "", toPlanId: "" });
    setCurrentPage(1);
  };

  const columns = [
    { key: "name", header: t("Rule") || "Rule" },
    { key: "from", header: t("From") || "From" },
    { key: "to", header: t("To") || "To" },
    { key: "policy", header: t("QuotaExceed") || "Quota Exceed" },
    { key: "strategy", header: t("Effective") || "Effective" },
    { key: "status", header: t("Status") || "Status" },
    { key: "version", header: t("Version") || "Version" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "name":
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.name}</p>
            {row.description && <p className="text-xs text-gray-500 line-clamp-1 max-w-[240px]">{row.description}</p>}
          </div>
        );
      case "from":
        return <span className="text-sm">{row.fromPlanId?.name || "-"}</span>;
      case "to":
        return <span className="text-sm">{row.toPlanId?.name || "-"}</span>;
      case "policy":
        return <Badge className={policyBadge(row.quotaExceedPolicy)}>{row.quotaExceedPolicy}</Badge>;
      case "strategy":
        return <span className="text-sm capitalize">{row.effectiveStrategy || "-"}</span>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "version":
        return <span className="text-sm font-medium">v{row.version || 1}</span>;
      case "actions":
        return (
          <div className="flex items-center gap-1">
            <IconButton
              icon="eye"
              onClick={() => setDetail(row)}
              aria-label="Details"
              title={t("Details") || "Details"}
            />
            {canEdit && (
              <IconButton
                icon="edit"
                onClick={() => openEdit(row)}
                aria-label="Edit"
                title={t("Edit") || "Edit"}
              />
            )}
            {canEdit && (
              <IconButton
                icon="copy"
                onClick={() => cloneMutation.mutate(row._id)}
                aria-label="Clone"
                title={t("Clone") || "Clone"}
              />
            )}
            {canDelete && (
              <IconButton
                icon="trash"
                onClick={() => handleDelete(row)}
                aria-label="Delete"
                title={t("Delete") || "Delete"}
              />
            )}
          </div>
        );

      default:
        return row[column.key];
    }
  };

  if (!canView) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("DowngradeRules") || "Downgrade Rules"}</PageTitle>

      <AnimatedContent>
        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Search") || "Search"}</label>
                <Input placeholder={t("SearchRules") || "Search rules..."} value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("AllStatus") || "All statuses"}</option>
                  {["draft", "active", "inactive", "archived"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("From") || "From Plan"}</label>
                <select value={filters.fromPlanId} onChange={(e) => handleFilterChange("fromPlanId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("AllPlans") || "All plans"}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("To") || "To Plan"}</label>
                <select value={filters.toPlanId} onChange={(e) => handleFilterChange("toPlanId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("AllPlans") || "All plans"}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetch()} className="h-10 whitespace-nowrap"><FiRefreshCw className="mr-2" /> {t("Refresh") || "Refresh"}</Button>
                <Button layout="outline" onClick={handleReset} className="h-10 whitespace-nowrap">{t("Reset") || "Reset"}</Button>
                {canCreate && (
                  <Button onClick={openCreate} className="h-10 whitespace-nowrap"><FiPlus className="mr-2" /> {t("NewRule") || "New Rule"}</Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{t("DowngradeRulesList") || "Downgrade Rules"}</h3>
              <p className="text-sm text-gray-500">{t("DowngradeRulesSubtitle") || "Define how plan downgrades are handled, including over-quota policy (refuse / deletion / read-only / grace period)."}</p>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={8} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
            ) : rules.length > 0 ? (
              <>
                <DataTable columns={columns} rows={rules} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderCell} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {rules.length} {t("Of") || "of"} {pagination.total}</span>
                  {pagination.pages > 1 && <Pagination totalResults={pagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page + 1)} label="Table navigation" />}
                </div>
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoRules") || "No downgrade rules found."}</p>
            )}
          </CardBody>
        </Card>

        {/* Validation panel */}
        <Card className="mt-6 bg-white dark:bg-gray-800">
          <CardBody>
            <h3 className="text-lg font-semibold mb-1"><FiShield className="inline mr-2 text-indigo-500" />{t("DowngradeValidation") || "Downgrade Validation"}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("DowngradeValidationSubtitle") || "Check whether a subscription can be downgraded to a target plan based on quota usage."}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Subscription") || "Subscription"}</label>
                <select value={validate.subscriptionId} onChange={(e) => setValidate((p) => ({ ...p, subscriptionId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("SelectSubscription") || "Select subscription..."}</option>
                  {subscriptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.storeId?.name || s._id} â€” {s.planId?.name || ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("TargetPlan") || "Target Plan"}</label>
                <select value={validate.toPlanId} onChange={(e) => setValidate((p) => ({ ...p, toPlanId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => validateMutation.mutate()} disabled={!validate.subscriptionId || !validate.toPlanId || validateMutation.isLoading} className="h-10">
                  <FiShield className="mr-2" /> {t("Validate") || "Validate Downgrade"}
                </Button>
              </div>
            </div>

            {validateMutation.isLoading && <TableLoading row={3} col={4} width={120} height={16} />}
            {validateResult && (
              <div className={`rounded border p-4 ${validateResult.allowed ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700" : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700"}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">{t("Allowed") || "Allowed"}</p>
                    <p className="font-semibold">{validateResult.allowed ? t("Yes") || "Yes" : t("No") || "No"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("Policy") || "Policy"}</p>
                    <Badge className={`mt-1 ${policyBadge(validateResult.policy)}`}>{validateResult.policy}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("EffectiveDate") || "Effective Date"}</p>
                    <p className="font-semibold">{dayjs(validateResult.effectiveDate).format("DD/MM/YYYY")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("OverQuota") || "Over-quota items"}</p>
                    <p className="font-semibold">{validateResult.overQuota?.length || 0}</p>
                  </div>
                </div>
                {validateResult.blockingReason && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-300">{validateResult.blockingReason}</p>
                )}
                {validateResult.overQuota?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{t("OverQuotaDetails") || "Over-quota details"}</p>
                    <div className="space-y-1">
                      {validateResult.overQuota.map((o) => (
                        <div key={o.quotaTypeCode} className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">{o.quotaTypeCode}</span>: {o.current} / {o.limit} (excess {o.excess})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      {/* Detail drawer */}
      <AppDrawer
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name}
        description={detail?.description}
        width="520px"
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge className={policyBadge(detail.quotaExceedPolicy)}>{detail.quotaExceedPolicy}</Badge>
              <Badge className={statusBadge(detail.status)}>{detail.status}</Badge>
              <Badge>v{detail.version || 1}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">{t("From") || "From"}</p><p className="font-medium">{detail.fromPlanId?.name || "-"}</p></div>
              <div><p className="text-xs text-gray-500">{t("To") || "To"}</p><p className="font-medium">{detail.toPlanId?.name || "-"}</p></div>
              <div><p className="text-xs text-gray-500">{t("GraceDays") || "Grace Days"}</p><p className="font-medium">{detail.graceDays || 0}</p></div>
              <div><p className="text-xs text-gray-500">{t("Effective") || "Effective"}</p><p className="font-medium capitalize">{detail.effectiveStrategy}</p></div>
              <div><p className="text-xs text-gray-500">{t("Approval") || "Approval"}</p><p className="font-medium">{detail.requiresApproval ? (detail.approvedByRole || "required") : "Auto"}</p></div>
              <div><p className="text-xs text-gray-500">{t("MinDaysOnPlan") || "Min Days On Plan"}</p><p className="font-medium">{detail.minDaysOnPlan || 0}</p></div>
              <div><p className="text-xs text-gray-500">{t("ProratedCredit") || "Prorated Credit"}</p><p className="font-medium">{detail.issueProratedCredit ? "Yes" : "No"}</p></div>
              <div><p className="text-xs text-gray-500">{t("PreserveExcess") || "Preserve Excess Data"}</p><p className="font-medium">{detail.preserveExcessData ? "Yes" : "No"}</p></div>
            </div>
          </div>
        )}
      </AppDrawer>

      {/* Create/Edit drawer */}
      <AppDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? (t("EditRule") || "Edit Downgrade Rule") : (t("NewRule") || "New Downgrade Rule")}
        width="560px"
        footer={
          <div className="flex justify-end gap-2">
            <Button layout="outline" type="button" onClick={() => setDrawerOpen(false)}>{t("Cancel") || "Cancel"}</Button>
            <Button type="submit" disabled={saveMutation.isLoading}>
              {saveMutation.isLoading ? (t("Saving") || "Saving...") : (editing ? (t("Update") || "Update") : (t("Create") || "Create"))}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Name") || "Name"} *</label>
            <Input value={form.name} onChange={(e) => handleField("name", e.target.value)} placeholder="Professional â†’ Starter" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Description") || "Description"}</label>
            <Input value={form.description} onChange={(e) => handleField("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("From") || "From Plan"} *</label>
              <select value={form.fromPlanId} onChange={(e) => handleField("fromPlanId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("To") || "To Plan"} *</label>
              <select value={form.toPlanId} onChange={(e) => handleField("toPlanId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaExceed") || "Quota Exceed Policy"}</label>
              <select value={form.quotaExceedPolicy} onChange={(e) => handleField("quotaExceedPolicy", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["grace_period", "refuse", "require_deletion", "read_only"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Effective") || "Effective Strategy"}</label>
              <select value={form.effectiveStrategy} onChange={(e) => handleField("effectiveStrategy", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["next_renewal", "immediate", "end_of_day", "manual_approval"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("GraceDays") || "Grace Days"}</label>
              <Input type="number" min="0" value={form.graceDays} onChange={(e) => handleField("graceDays", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("ApprovedByRole") || "Approved By Role"}</label>
              <select value={form.approvedByRole} onChange={(e) => handleField("approvedByRole", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["sales_manager", "finance", "admin", "store_owner", "any"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("MinDaysOnPlan") || "Min Days On Plan"}</label>
              <Input type="number" min="0" value={form.minDaysOnPlan} onChange={(e) => handleField("minDaysOnPlan", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("AppliesTo") || "Applies To"}</label>
              <select value={form.appliesTo} onChange={(e) => handleField("appliesTo", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["all", "specific_stores", "specific_plans"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
            <select value={form.status} onChange={(e) => handleField("status", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {["draft", "active", "inactive", "archived"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => handleField("requiresApproval", e.target.checked)} className="rounded" />
              {t("RequiresApproval") || "Requires manual approval"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.issueProratedCredit} onChange={(e) => handleField("issueProratedCredit", e.target.checked)} className="rounded" />
              {t("ProratedCredit") || "Issue prorated credit"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.preserveExcessData} onChange={(e) => handleField("preserveExcessData", e.target.checked)} className="rounded" />
              {t("PreserveExcess") || "Preserve excess data"}
            </label>
          </div>
        </form>
      </AppDrawer>
    </>
  );
};

export default DowngradeRules;
