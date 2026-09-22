import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, CardBody, Input, Pagination, Select } from "@windmill/react-ui";
import dayjs from "dayjs";
import { FiRefreshCw, FiPlus, FiEdit3, FiTrash2, FiCheck, FiX } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import DataTable from "@/components/tables/CDataTable";
import TableLoading from "@/components/preloader/TableLoading";
import DiscountServices from "@/services/DiscountServices";
import PlatformCouponServices from "@/services/PlatformCouponServices";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import { Button } from "@sofia/ui";

const discountTypeBadge = (type) => {
  const map = {
    flat: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    percentage: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };
  return map[type] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const statusBadge = (active) => {
  return active
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
};

const Discounts = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({ search: "", active: "", couponId: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const canEdit = hasPermission("platform_plan", "update") || hasPermission("platform", "manage");

  const { data: couponsData } = useQuery({
    queryKey: ["coupons-list-discounts"],
    queryFn: () => PlatformCouponServices.getAllCoupons({ limit: 500 }),
    staleTime: 5 * 60 * 1000,
  });
  const coupons = couponsData?.data || [];

  const { data: discountsData, isLoading, error, refetch } = useQuery({
    queryKey: ["discounts", filters, currentPage],
    queryFn: () =>
      DiscountServices.getDiscounts({
        page: currentPage,
        limit: pageSize,
        couponId: filters.couponId,
        active: filters.active,
        search: filters.search,
      }),
  });

  const discounts = discountsData?.data || [];
  const pagination = discountsData?.pagination || { total: 0, page: 1, limit: pageSize, pages: 0 };

  const deleteMutation = useMutation({
    mutationFn: (id) => DiscountServices.deleteDiscount(id),
    onSuccess: () => {
      successMessage(t("DiscountDeleted") || "Discount deleted");
      queryClient.invalidateQueries(["discounts"]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message || "Delete failed"),
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({ search: "", active: "", couponId: "" });
    setCurrentPage(1);
  };

  const columns = [
    { key: "code", header: t("Code") || "Code" },
    { key: "coupon", header: t("Coupon") || "Coupon" },
    { key: "discountType", header: t("Type") || "Type" },
    { key: "discountAmount", header: t("Amount") || "Amount" },
    { key: "appliesTo", header: t("AppliesTo") || "Applies To" },
    { key: "validity", header: t("Validity") || "Validity" },
    { key: "status", header: t("Status") || "Status" },
    { key: "actions", header: "" },
  ];

  const renderCell = ({ row, column }) => {
    switch (column.key) {
      case "code":
        return <span className="text-sm font-semibold">{row.code}</span>;
      case "coupon":
        return <span className="text-sm">{row.couponId?.code || row.couponId?.title || "-"}</span>;
      case "discountType":
        return <Badge className={discountTypeBadge(row.discountType)}>{row.discountType}</Badge>;
      case "discountAmount":
        return <span className="text-sm font-semibold">{row.discountType === "percentage" ? `${row.discountAmount}%` : `${row.discountAmount}`}</span>;
      case "appliesTo":
        return <span className="text-sm">{t(`discountApplies.${row.appliesTo}`) || row.appliesTo}</span>;
      case "validity":
        return (
          <span className="text-xs text-gray-500">
            {dayjs(row.validFrom).format("DD/MM/YYYY")} â†’ {dayjs(row.validUntil).format("DD/MM/YYYY")}
          </span>
        );
      case "status":
        return <Badge className={statusBadge(row.active)}>{row.active ? t("Active") : t("Inactive")}</Badge>;
      case "actions":
        return (
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button layout="outline" size="small" onClick={() => deleteMutation.mutate(row._id)} disabled={deleteMutation.isLoading}>
                  <FiTrash2 className="mr-1" />{t("Delete") || "Delete"}
                </Button>
              </>
            )}
          </div>
        );
      default:
        return row[column.key];
    }
  };

  if (!hasPermission("platform_plan", "view")) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("Discounts") || "Discounts"}</PageTitle>

      <AnimatedContent>
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Search") || "Search"}</label>
                <Input
                  type="search"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder={t("SearchDiscounts") || "Search discounts..."}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Coupon") || "Coupon"}</label>
                <select
                  value={filters.couponId}
                  onChange={(e) => handleFilterChange("couponId", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllCoupons") || "All coupons"}</option>
                  {coupons.map((c) => (
                    <option key={c._id} value={c._id}>{c.code || c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t("Status") || "Status"}</label>
                <select
                  value={filters.active}
                  onChange={(e) => handleFilterChange("active", e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatuses") || "All statuses"}</option>
                  <option value="true">{t("Active") || "Active"}</option>
                  <option value="false">{t("Inactive") || "Inactive"}</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => refetch()} className="h-10">
                  <FiRefreshCw className="mr-2" />{t("Refresh") || "Refresh"}
                </Button>
                <Button layout="outline" onClick={handleReset} className="h-10">
                  {t("Reset") || "Reset"}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <TableLoading row={8} col={8} width={130} height={20} />
            ) : error ? (
              <p className="px-4 py-10 text-center text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
            ) : discounts.length > 0 ? (
              <>
                <DataTable columns={columns} rows={discounts} getRowKey={(row) => row._id} tableClassName="min-w-full" cellClassName="px-4 py-3" renderCell={renderCell} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("Showing") || "Showing"} {discounts.length} {t("Of") || "of"} {pagination.total}</span>
                  {pagination.pages > 1 && <Pagination totalResults={pagination.total || 0} resultsPerPage={pageSize} onChange={(page) => setCurrentPage(page + 1)} label="Table navigation" />}
                </div>
              </>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">{t("NoDiscounts") || "No discounts found."}</p>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>
    </>
  );
};

export default Discounts;