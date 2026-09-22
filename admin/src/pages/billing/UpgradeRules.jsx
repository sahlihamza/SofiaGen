import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";
import dayjs from "dayjs";
import { FiPlus, FiEdit3, FiTrash2, FiCopy, FiEye, FiRefreshCw, FiZap } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import AppDrawer from "@/components/ui/AppDrawer";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import PlanUpgradeRuleServices from "@/services/PlanUpgradeRuleServices";
import PlanServices from "@/services/PlanServices";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const strategyBadge = (strategy) => {
  const map = {
    immediate: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    prorata: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    next_renewal: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    manual_approval: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };
  return map[strategy] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
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
  strategy: "prorata",
  requiresApproval: false,
  approvedByRole: "any",
  prorataMode: "daily",
  allowSchedule: true,
  minDaysOnPlan: 0,
  generateInvoiceImmediately: true,
  appliesTo: "all",
  storeIds: [],
  status: "draft",
};

const UpgradeRules = () => {
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
  const [preview, setPreview] = useState({ subscriptionId: "", toPlanId: "" });
  const [previewResult, setPreviewResult] = useState(null);

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");
  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");
  const canCreate = hasPermission("platform_plan", "create") || canEdit;
  const canDelete = hasPermission("platform_plan", "delete");

  const { data: plansData } = useQuery({
    queryKey: ["plans-active-list-upg"],
    queryFn: () => PlanServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];

  const { data: subsData } = useQuery({
    queryKey: ["subscriptions-list-upg"],
    queryFn: () => SubscriptionServices.getAllSubscriptions({ status: "active", limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const subscriptions = subsData?.data || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["upgrade-rules", filters, currentPage],
    queryFn: () =>
      PlanUpgradeRuleServices.getUpgradeRules({
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
        ? PlanUpgradeRuleServices.updateUpgradeRule(editing._id, payload)
        : PlanUpgradeRuleServices.createUpgradeRule(payload),
    onSuccess: () => {
      successMessage(t(editing ? "RuleUpdated" : "RuleCreated") || (editing ? "Upgrade rule updated" : "Upgrade rule created"));
      queryClient.invalidateQueries(["upgrade-rules"]);
      setDrawerOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Save failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => PlanUpgradeRuleServices.updateUpgradeRuleStatus(id, status),
    onSuccess: () => {
      successMessage(t("StatusUpdated") || "Status updated");
      queryClient.invalidateQueries(["upgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Status update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => PlanUpgradeRuleServices.deleteUpgradeRule(id),
    onSuccess: () => {
      successMessage(t("RuleDeleted") || "Upgrade rule deleted");
      queryClient.invalidateQueries(["upgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Delete failed"),
  });

  const cloneMutation = useMutation({
    mutationFn: (id) => PlanUpgradeRuleServices.cloneUpgradeRule(id),
    onSuccess: () => {
      successMessage(t("RuleCloned") || "Upgrade rule cloned");
      queryClient.invalidateQueries(["upgrade-rules"]);
    },
    onError: (err) => errorMessage(err?.message || "Clone failed"),
  });

  const previewMutation = useMutation({
    mutationFn: () => PlanUpgradeRuleServices.previewUpgrade(preview),
    onSuccess: (res) => setPreviewResult(res?.data || null),
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Preview failed"),
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
      strategy: rule.strategy || "prorata",
      requiresApproval: !!rule.requiresApproval,
      approvedByRole: rule.approvedByRole || "any",
      prorataMode: rule.prorataMode || "daily",
      allowSchedule: !!rule.allowSchedule,
      minDaysOnPlan: rule.minDaysOnPlan || 0,
      generateInvoiceImmediately: !!rule.generateInvoiceImmediately,
      appliesTo: rule.appliesTo || "all",
      storeIds: rule.storeIds || [],
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
    saveMutation.mutate({ ...form, requiresApproval: !!form.requiresApproval, allowSchedule: !!form.allowSchedule, generateInvoiceImmediately: !!form.generateInvoiceImmediately });
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

  const planName = (id) => plans.find((p) => p._id === id)?.name || id || "-";

  const columns = [
    { key: "name", header: t("Rule") || "Rule" },
    { key: "from", header: t("From") || "From" },
    { key: "to", header: t("To") || "To" },
    { key: "strategy", header: t("Strategy") || "Strategy" },
    { key: "approval", header: t("Approval") || "Approval" },
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
      case "strategy":
        return <Badge className={strategyBadge(row.strategy)}>{row.strategy}</Badge>;
      case "approval":
        return row.requiresApproval ? (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">{row.approvedByRole || "required"}</Badge>
        ) : (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Auto</Badge>
        );
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "version":
        return <span className="text-sm font-medium">v{row.version || 1}</span>;
      case "actions":
        return (
          <div className="flex items-center gap-1">
            <IconButton icon="eye" onClick={() => setDetail(row)} aria-label="Details" title={t("Details") || "Details"} />
            {canEdit && (
              <IconButton icon="edit" onClick={() => openEdit(row)} aria-label="Edit" title={t("Edit") || "Edit"} />
            )}
            {canEdit && (
              <IconButton icon="copy" onClick={() => cloneMutation.mutate(row._id)} aria-label="Clone" title={t("Clone") || "Clone"} />
            )}
            {canDelete && (
              <IconButton icon="trash" onClick={() => handleDelete(row)} aria-label="Delete" title={t("Delete") || "Delete"} />
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
      <PageTitle>{t("UpgradeRules") || "Upgrade Rules"}</PageTitle>

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
              <h3 className="text-lg font-semibold">{t("UpgradeRulesList") || "Upgrade Rules"}</h3>
              <p className="text-sm text-gray-500">{t("UpgradeRulesSubtitle") || "Define how plan upgrades are billed (immediate / prorata / next renewal / manual approval)."}</p>
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
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoRules") || "No upgrade rules found."}</p>
            )}
          </CardBody>
        </Card>

        {/* Preview panel */}
        <Card className="mt-6 bg-white dark:bg-gray-800">
          <CardBody>
            <h3 className="text-lg font-semibold mb-1"><FiZap className="inline mr-2 text-indigo-500" />{t("UpgradePreview") || "Upgrade Preview"}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("UpgradePreviewSubtitle") || "Compute the billing impact of an upgrade for a subscription."}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Subscription") || "Subscription"}</label>
                <select value={preview.subscriptionId} onChange={(e) => setPreview((p) => ({ ...p, subscriptionId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("SelectSubscription") || "Select subscription..."}</option>
                  {subscriptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.storeId?.name || s._id} â€” {s.planId?.name || ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("TargetPlan") || "Target Plan"}</label>
                <select value={preview.toPlanId} onChange={(e) => setPreview((p) => ({ ...p, toPlanId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("SelectPlan") || "Select a plan..."}</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => previewMutation.mutate()} disabled={!preview.subscriptionId || !preview.toPlanId || previewMutation.isLoading} className="h-10">
                  <FiZap className="mr-2" /> {t("Preview") || "Preview Upgrade"}
                </Button>
              </div>
            </div>

            {previewMutation.isLoading && <TableLoading row={3} col={4} width={120} height={16} />}
            {previewResult && (
              <div className="rounded border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">{t("Strategy") || "Strategy"}</p>
                    <p className="font-semibold capitalize">{previewResult.strategy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("EffectiveDate") || "Effective Date"}</p>
                    <p className="font-semibold">{dayjs(previewResult.effectiveDate).format("DD/MM/YYYY")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("Credit") || "Credit"}</p>
                    <p className="font-semibold text-emerald-600">{previewResult.creditValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("AmountDue") || "Amount Due"}</p>
                    <p className="font-semibold text-indigo-600">{previewResult.amountDue}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{previewResult.description}</p>
                {previewResult.requiresApproval && (
                  <Badge className="mt-2 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">{t("ApprovalRequired") || "Approval Required"}</Badge>
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
          <>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={strategyBadge(detail.strategy)}>{detail.strategy}</Badge>
                <Badge className={statusBadge(detail.status)}>{detail.status}</Badge>
                <Badge>v{detail.version || 1}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">{t("From") || "From"}</p><p className="font-medium">{detail.fromPlanId?.name || "-"}</p></div>
                <div><p className="text-xs text-gray-500">{t("To") || "To"}</p><p className="font-medium">{detail.toPlanId?.name || "-"}</p></div>
                <div><p className="text-xs text-gray-500">{t("ProrataMode") || "Prorata Mode"}</p><p className="font-medium capitalize">{detail.prorataMode}</p></div>
                <div><p className="text-xs text-gray-500">{t("MinDaysOnPlan") || "Min Days On Plan"}</p><p className="font-medium">{detail.minDaysOnPlan || 0}</p></div>
                <div><p className="text-xs text-gray-500">{t("Approval") || "Approval"}</p><p className="font-medium">{detail.requiresApproval ? (detail.approvedByRole || "required") : "Auto"}</p></div>
                <div><p className="text-xs text-gray-500">{t("InvoiceImmediately") || "Invoice Immediately"}</p><p className="font-medium">{detail.generateInvoiceImmediately ? "Yes" : "No"}</p></div>
                <div><p className="text-xs text-gray-500">{t("AppliesTo") || "Applies To"}</p><p className="font-medium">{detail.appliesTo}</p></div>
                <div><p className="text-xs text-gray-500">{t("AllowSchedule") || "Allow Schedule"}</p><p className="font-medium">{detail.allowSchedule ? "Yes" : "No"}</p></div>
              </div>
            </div>
          </>
        )}
      </AppDrawer>

      {/* Create/Edit drawer */}
      <AppDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? (t("EditRule") || "Edit Upgrade Rule") : (t("NewRule") || "New Upgrade Rule")}
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
            <Input value={form.name} onChange={(e) => handleField("name", e.target.value)} placeholder="Starter â†’ Professional" />

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
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Strategy") || "Strategy"}</label>
              <select value={form.strategy} onChange={(e) => handleField("strategy", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["immediate", "prorata", "next_renewal", "manual_approval"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("ProrataMode") || "Prorata Mode"}</label>
              <select value={form.prorataMode} onChange={(e) => handleField("prorataMode", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["daily", "hourly", "percentage"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("ApprovedByRole") || "Approved By Role"}</label>
              <select value={form.approvedByRole} onChange={(e) => handleField("approvedByRole", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["sales_manager", "finance", "admin", "store_owner", "any"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("MinDaysOnPlan") || "Min Days On Plan"}</label>
              <Input type="number" min="0" value={form.minDaysOnPlan} onChange={(e) => handleField("minDaysOnPlan", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("AppliesTo") || "Applies To"}</label>
              <select value={form.appliesTo} onChange={(e) => handleField("appliesTo", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["all", "specific_stores", "specific_plans"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
              <select value={form.status} onChange={(e) => handleField("status", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["draft", "active", "inactive", "archived"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => handleField("requiresApproval", e.target.checked)} className="rounded" />
              {t("RequiresApproval") || "Requires manual approval"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allowSchedule} onChange={(e) => handleField("allowSchedule", e.target.checked)} className="rounded" />
              {t("AllowSchedule") || "Allow scheduling to next renewal"}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.generateInvoiceImmediately} onChange={(e) => handleField("generateInvoiceImmediately", e.target.checked)} className="rounded" />
              {t("InvoiceImmediately") || "Generate invoice immediately"}
            </label>
          </div>
        </form>
      </AppDrawer>
    </>
  );
};

export default UpgradeRules;
