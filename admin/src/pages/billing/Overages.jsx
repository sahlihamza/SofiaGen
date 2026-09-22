import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination } from "@windmill/react-ui";
import { AppDrawer } from "@/components/ui";
import dayjs from "dayjs";
import { FiPlus, FiEdit3, FiTrash2, FiEye, FiRefreshCw, FiZap, FiFileText } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import OverageServices from "@/services/OverageServices";
import PlanServices from "@/services/PlanServices";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const statusBadge = (status) => {
  const map = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };
  return map[status] || map.draft;
};

const strategyBadge = (strategy) => {
  const map = {
    pay_as_you_go: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    prepaid: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };
  return map[strategy] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const EMPTY_FORM = {
  quotaTypeCode: "",
  quotaTypeId: "",
  planIds: [],
  appliesToAllPlans: true,
  threshold: 0,
  unitPrice: 0,
  currency: "USD",
  billingStrategy: "pay_as_you_go",
  maxOverage: 0,
  minBillableQty: 1,
  roundingMode: "none",
  name: "",
  description: "",
  status: "draft",
};

const Overages = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const filters = useMemo(() => ({ search: "", status: "", quotaTypeCode: "", planId: "" }), []);
  const [curFilters, setCurFilters] = useState(filters);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);
  const [calc, setCalc] = useState({ subscriptionId: "", periodStart: "", periodEnd: "" });
  const [calcResult, setCalcResult] = useState(null);

  const canView = hasPermission("platform_plan", "view") || hasPermission("platform", "view");
  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");
  const canCreate = hasPermission("platform_plan", "create") || canEdit;
  const canDelete = hasPermission("platform_plan", "delete");

  const { data: plansData } = useQuery({
    queryKey: ["plans-active-list-ov"],
    queryFn: () => PlanServices.getActivePlans(),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansData?.data || [];

  const { data: quotaData } = useQuery({
    queryKey: ["quota-types-list-ov"],
    queryFn: () => QuotaTypeServices.getAllQuotaTypes({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const quotaTypes = quotaData?.data || [];

  const { data: subsData } = useQuery({
    queryKey: ["subscriptions-list-ov"],
    queryFn: () => SubscriptionServices.getAllSubscriptions({ status: "active", limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const subscriptions = subsData?.data || [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["overages", curFilters, currentPage],
    queryFn: () =>
      OverageServices.getOverages({
        page: currentPage,
        limit: pageSize,
        search: curFilters.search,
        status: curFilters.status,
        quotaTypeCode: curFilters.quotaTypeCode,
        planId: curFilters.planId,
        sort: "-createdAt",
      }),
  });

  const rules = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? OverageServices.updateOverage(editing._id, payload) : OverageServices.createOverage(payload),
    onSuccess: () => {
      successMessage(t(editing ? "RuleUpdated" : "RuleCreated") || (editing ? "Overage rule updated" : "Overage rule created"));
      queryClient.invalidateQueries(["overages"]);
      setDrawerOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Save failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => OverageServices.updateOverageStatus(id, status),
    onSuccess: () => {
      successMessage(t("StatusUpdated") || "Status updated");
      queryClient.invalidateQueries(["overages"]);
    },
    onError: (err) => errorMessage(err?.message || "Status update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => OverageServices.deleteOverage(id),
    onSuccess: () => {
      successMessage(t("RuleDeleted") || "Overage rule deleted");
      queryClient.invalidateQueries(["overages"]);
    },
    onError: (err) => errorMessage(err?.message || "Delete failed"),
  });

  const calcMutation = useMutation({
    mutationFn: () => OverageServices.calculateOverage(calc),
    onSuccess: (res) => setCalcResult(res?.data || null),
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Calculate failed"),
  });

  const genInvoiceMutation = useMutation({
    mutationFn: () => OverageServices.generateOverageInvoice(calc),
    onSuccess: (res) => {
      successMessage(res?.data?.status === "no_overage" ? "No overage to invoice" : "Overage invoice generated");
      setCalcResult(res?.data || null);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Invoice generation failed"),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      quotaTypeCode: rule.quotaTypeCode || "",
      quotaTypeId: rule.quotaTypeId?._id || rule.quotaTypeId || "",
      planIds: (rule.planIds || []).map((p) => p._id || p),
      appliesToAllPlans: !!rule.appliesToAllPlans,
      threshold: rule.threshold ?? 0,
      unitPrice: rule.unitPrice ?? 0,
      currency: rule.currency || "USD",
      billingStrategy: rule.billingStrategy || "pay_as_you_go",
      maxOverage: rule.maxOverage ?? 0,
      minBillableQty: rule.minBillableQty ?? 1,
      roundingMode: rule.roundingMode || "none",
      name: rule.name || "",
      description: rule.description || "",
      status: rule.status || "draft",
    });
    setDrawerOpen(true);
  };

  const handleField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.quotaTypeCode || form.unitPrice == null) {
      errorMessage(t("QuotaAndPriceRequired") || "Quota type and unit price are required");
      return;
    }
    saveMutation.mutate({ ...form, appliesToAllPlans: !!form.appliesToAllPlans });
  };

  const handleDelete = (rule) => {
    deleteMutation.mutate(rule._id);
  };

  const handleFilterChange = (field, value) => {
    setCurFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setCurFilters(filters);
    setCurrentPage(1);
  };

  const planName = (id) => plans.find((p) => p._id === id)?.name || id || "-";

  const columns = [
    { key: "quotaTypeCode", header: t("QuotaType") || "Quota Type" },
    { key: "plans", header: t("Plans") || "Plans" },
    { key: "unitPrice", header: t("UnitPrice") || "Unit Price" },
    { key: "strategy", header: t("Strategy") || "Strategy" },
    { key: "threshold", header: t("Threshold") || "Threshold" },
    { key: "status", header: t("Status") || "Status" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "quotaTypeCode":
        return (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{row.quotaTypeCode}</p>
            {row.name && <p className="text-xs text-gray-500">{row.name}</p>}
          </div>
        );
      case "plans":
        return row.appliesToAllPlans ? (
          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">{t("AllPlans") || "All Plans"}</Badge>
        ) : (
          <span className="text-sm">{row.planIds?.length ? row.planIds.map((p) => p.name).join(", ") : "-"}</span>
        );
      case "unitPrice":
        return <span className="text-sm font-medium">{row.unitPrice} {row.currency}</span>;
      case "strategy":
        return <Badge className={strategyBadge(row.billingStrategy)}>{row.billingStrategy}</Badge>;
      case "threshold":
        return <span className="text-sm">{row.threshold ?? 0}</span>;
      case "status":
        return <Badge className={statusBadge(row.status)}>{row.status}</Badge>;
      case "actions":
        return (
          <div className="flex items-center gap-1">
            <IconButton icon="eye" onClick={() => setDetail(row)} aria-label="Details" title={t("Details") || "Details"} />
            {canEdit && (
              <IconButton icon="edit" onClick={() => openEdit(row)} aria-label="Edit" title={t("Edit") || "Edit"} />
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
      <PageTitle>{t("Overages") || "Overage Billing"}</PageTitle>

      <AnimatedContent>
        {/* Filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Search") || "Search"}</label>
                <Input placeholder={t("SearchRules") || "Search rules..."} value={curFilters.search} onChange={(e) => handleFilterChange("search", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select value={curFilters.status} onChange={(e) => handleFilterChange("status", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("AllStatus") || "All statuses"}</option>
                  {["draft", "active", "inactive", "archived"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"}</label>
                <Input placeholder="orders" value={curFilters.quotaTypeCode} onChange={(e) => handleFilterChange("quotaTypeCode", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Plan") || "Plan"}</label>
                <select value={curFilters.planId} onChange={(e) => handleFilterChange("planId", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
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
              <h3 className="text-lg font-semibold">{t("OveragesList") || "Overage Rules"}</h3>
              <p className="text-sm text-gray-500">{t("OveragesSubtitle") || "Define per-quota overage billing for plan inclusions."}</p>
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
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoRules") || "No overage rules found."}</p>
            )}
          </CardBody>
        </Card>

        {/* Calculate / generate invoice panel */}
        <Card className="mt-6 bg-white dark:bg-gray-800">
          <CardBody>
            <h3 className="text-lg font-semibold mb-1"><FiZap className="inline mr-2 text-indigo-500" />{t("OverageCalculator") || "Overage Calculator"}</h3>
            <p className="text-sm text-gray-500 mb-4">{t("OverageCalcSubtitle") || "Compute overage for a subscription over a period, or generate an overage invoice."}</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Subscription") || "Subscription"}</label>
                <select value={calc.subscriptionId} onChange={(e) => setCalc((p) => ({ ...p, subscriptionId: e.target.value }))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                  <option value="">{t("SelectSubscription") || "Select subscription..."}</option>
                  {subscriptions.map((s) => (
                    <option key={s._id} value={s._id}>{s.storeId?.name || s._id} â€” {s.planId?.name || ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("PeriodStart") || "Period Start"}</label>
                <Input type="date" value={calc.periodStart} onChange={(e) => setCalc((p) => ({ ...p, periodStart: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("PeriodEnd") || "Period End"}</label>
                <Input type="date" value={calc.periodEnd} onChange={(e) => setCalc((p) => ({ ...p, periodEnd: e.target.value }))} />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => calcMutation.mutate()} disabled={!calc.subscriptionId || calcMutation.isLoading} className="h-10">
                  <FiZap className="mr-2" /> {t("Calculate") || "Calculate"}
                </Button>
                <Button onClick={() => genInvoiceMutation.mutate()} disabled={!calc.subscriptionId || genInvoiceMutation.isLoading} layout="outline" className="h-10">
                  <FiFileText className="mr-2" /> {t("GenerateInvoice") || "Generate Invoice"}
                </Button>
              </div>
            </div>

            {calcMutation.isLoading && <TableLoading row={3} col={4} width={120} height={16} />}
            {calcResult && (
              <div className="rounded border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-indigo-700 dark:text-indigo-300">{t("TotalOverage") || "Total Overage"}: {calcResult.total} {calcResult.currency}</p>
                  {calcResult.invoiceId && <Badge className="bg-green-100 text-green-800">Invoice: {calcResult.invoiceId}</Badge>}
                </div>
                {calcResult.items?.length ? (
                  <div className="mt-3 space-y-2">
                    {calcResult.items.map((i, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge className="bg-indigo-100 text-indigo-800">{i.quotaTypeCode}</Badge>
                        <span>used <b>{i.used}</b> / included <b>{i.included}</b> â†’ excess <b>{i.excess}</b></span>
                        <span className="text-gray-500">billed {i.billableQty} @ {i.unitPrice} = <b>{i.amount}</b></span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t("NoOverageFound") || "No overage found for this period."}</p>
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
        title={detail ? (detail.name || detail.quotaTypeCode) : ""}
        description={detail?.description}
        width="520px"
      >
        {detail && (
          <>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge className={strategyBadge(detail.billingStrategy)}>{detail.billingStrategy}</Badge>
                <Badge className={statusBadge(detail.status)}>{detail.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">{t("QuotaType") || "Quota Type"}</p><p className="font-medium">{detail.quotaTypeCode}</p></div>
                <div><p className="text-xs text-gray-500">{t("UnitPrice") || "Unit Price"}</p><p className="font-medium">{detail.unitPrice} {detail.currency}</p></div>
                <div><p className="text-xs text-gray-500">{t("Threshold") || "Threshold"}</p><p className="font-medium">{detail.threshold ?? 0}</p></div>
                <div><p className="text-xs text-gray-500">{t("MaxOverage") || "Max Overage"}</p><p className="font-medium">{detail.maxOverage || "Unlimited"}</p></div>
                <div><p className="text-xs text-gray-500">{t("MinBillableQty") || "Min Billable Qty"}</p><p className="font-medium">{detail.minBillableQty}</p></div>
                <div><p className="text-xs text-gray-500">{t("Rounding") || "Rounding"}</p><p className="font-medium capitalize">{detail.roundingMode}</p></div>
                <div><p className="text-xs text-gray-500">{t("AppliesTo") || "Applies To"}</p><p className="font-medium">{detail.appliesToAllPlans ? "All Plans" : (detail.planIds?.map((p) => p.name).join(", ") || "-")}</p></div>
              </div>
            </div>
          </>
        )}
      </AppDrawer>

      {/* Create/Edit drawer */}
      <AppDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? (t("EditRule") || "Edit Overage Rule") : (t("NewRule") || "New Overage Rule")}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("QuotaType") || "Quota Type"} *</label>
              <select value={form.quotaTypeCode} onChange={(e) => { const q = quotaTypes.find((qt) => qt._id === e.target.value); handleField("quotaTypeCode", q?.code || e.target.value); handleField("quotaTypeId", e.target.value); }} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                <option value="">{t("SelectQuotaType") || "Select quota type..."}</option>
                {quotaTypes.map((qt) => (
                  <option key={qt._id} value={qt._id}>{qt.code} â€” {qt.name}</option>
                ))}
              </select>

            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("UnitPrice") || "Unit Price"} *</label>
              <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => handleField("unitPrice", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Currency") || "Currency"}</label>
              <Input value={form.currency} onChange={(e) => handleField("currency", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("BillingStrategy") || "Billing Strategy"}</label>
              <select value={form.billingStrategy} onChange={(e) => handleField("billingStrategy", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["pay_as_you_go", "prepaid"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Threshold") || "Threshold"}</label>
              <Input type="number" min="0" value={form.threshold} onChange={(e) => handleField("threshold", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("MaxOverage") || "Max Overage (0=unlimited)"}</label>
              <Input type="number" min="0" value={form.maxOverage} onChange={(e) => handleField("maxOverage", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("MinBillableQty") || "Min Billable Qty"}</label>
              <Input type="number" min="1" value={form.minBillableQty} onChange={(e) => handleField("minBillableQty", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Rounding") || "Rounding Mode"}</label>
              <select value={form.roundingMode} onChange={(e) => handleField("roundingMode", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {["none", "up", "down", "nearest"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Name") || "Name"}</label>
            <Input value={form.name} onChange={(e) => handleField("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Description") || "Description"}</label>
            <Input value={form.description} onChange={(e) => handleField("description", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
            <select value={form.status} onChange={(e) => handleField("status", e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {["draft", "active", "inactive", "archived"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.appliesToAllPlans} onChange={(e) => handleField("appliesToAllPlans", e.target.checked)} className="rounded" />
            {t("AppliesToAllPlans") || "Applies to all plans"}
          </label>
          {!form.appliesToAllPlans && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t("Plans") || "Plans"}</label>
              <select multiple value={form.planIds} onChange={(e) => handleField("planIds", Array.from(e.target.selectedOptions, (o) => o.value))} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </form>
      </AppDrawer>
    </>
  );
};

export default Overages;
