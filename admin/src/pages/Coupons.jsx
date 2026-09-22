import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiCopy, FiDownload, FiEdit, FiPlus, FiPower, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import PageTitle from "@/components/Typography/PageTitle";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import CouponDrawer from "@/components/drawer/CouponDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

// Story 13: Actif=vert, ExpirÃ©=rouge, PlanifiÃ©=bleu, DÃ©sactivÃ©=gris, ArchivÃ©=gris foncÃ©
const STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-600",
  inactive: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-50 text-blue-600",
  expired: "bg-red-50 text-red-500",
  archived: "bg-gray-600 text-white",
};

const DISCOUNT_TYPE_LABEL_KEY = {
  percentage: "DiscountTypePercentage",
  fixed_cart: "DiscountTypeFixedCart",
  fixed_product: "DiscountTypeFixedProduct",
  buy_x_get_y: "DiscountTypeBuyXGetY",
  free_gift: "DiscountTypeFreeGift",
  shipping_discount: "DiscountTypeShippingDiscount",
};

// Story 15: a single quick-filter select, mutually exclusive. The first four
// map to the `status` field; the last three are separate boolean/numeric
// conditions the backend now also accepts (Phase 7 additive query params).
const QUICK_FILTERS = [
  { value: "", params: {} },
  { value: "active", params: { status: "active" } },
  { value: "expired", params: { status: "expired" } },
  { value: "scheduled", params: { status: "scheduled" } },
  { value: "inactive", params: { status: "inactive" } },
  { value: "used", params: { usedOnly: "true" } },
  { value: "freeShipping", params: { allowFreeShipping: "true" } },
  { value: "autoApply", params: { autoApply: "true" } },
];

const Coupons = () => {
  const { t } = useTranslation();
  const {
    setIsUpdate,
    currentPage,
    handleChangePage,
    searchText,
    setSearchText,
    searchRef,
    handleSubmitForAll,
    limitData,
  } = useContext(SidebarContext);
  const { currency } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canCreateCoupon = hasPermission("coupons", "create");
  const canUpdateCoupon = hasPermission("coupons", "update");
  const canDeleteCoupon = hasPermission("coupons", "delete");
  const canDuplicateCoupon = hasPermission("coupons", "duplicate");
  const canActivateCoupon = hasPermission("coupons", "activate");
  const canDeactivateCoupon = hasPermission("coupons", "deactivate");
  const canExportCoupon = hasPermission("coupons", "export");

  const [quickFilter, setQuickFilter] = useState("");
  const [showTrash, setShowTrash] = useState(false);

  const activeFilterParams = QUICK_FILTERS.find((f) => f.value === quickFilter)?.params || {};

  const { data, loading, error } = useAsync(() =>
    CouponServices.getAllCoupons({
      page: currentPage,
      limit: limitData,
      search: searchText,
      deletedOnly: showTrash ? "true" : "",
      ...activeFilterParams,
    })
  );
  const couponList = data?.data || [];

  const { serviceId, handleUpdate } = useToggleDrawer();

  const handleResetField = () => {
    setQuickFilter("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const handleToggleTrash = () => {
    setShowTrash((prev) => !prev);
    setQuickFilter("");
    setIsUpdate(true);
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (coupon) => {
    setPendingDelete(coupon);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      await CouponServices.deleteCoupon(pendingDelete._id);
      notifySuccess(t("CouponDeleteSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const handleDuplicate = async (coupon) => {
    try {
      await CouponServices.duplicateCoupon(coupon._id);
      notifySuccess(t("CouponDuplicateSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleToggleStatus = async (coupon) => {
    try {
      if (coupon.status === "active") {
        await CouponServices.deactivateCoupon(coupon._id);
        notifySuccess(t("CouponDeactivateSuccess"));
      } else {
        await CouponServices.activateCoupon(coupon._id);
        notifySuccess(t("CouponActivateSuccess"));
      }
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // Story 16: client-side CSV export of the coupons currently loaded in the
  // table â€” no dedicated export endpoint exists, so this simply serializes

  // what's already been fetched.
  const handleExport = () => {
    const headers = ["code", "description", "discountType", "amount", "status", "usedCount", "usageLimit", "startDate", "endDate"];
    const rows = couponList.map((coupon) => headers.map((key) => coupon[key] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = async (coupon) => {
    try {
      await CouponServices.restoreCoupon(coupon._id);
      notifySuccess(t("CouponRestoreSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "â€”";


  const formatAmount = (coupon) => {
    if (coupon.discountType === "percentage") return `${coupon.amount}%`;
    if (coupon.discountType === "fixed_cart" || coupon.discountType === "fixed_product") {
      return `${currency}${coupon.amount}`;
    }
    return "â€”";
  };

  const formatUsage = (coupon) => `${coupon.usedCount ?? 0} / ${coupon.usageLimit ?? "âˆž"}`;


  return (
    <>
      <PageTitle>{t("CouponspageTitle")}</PageTitle>

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("CouponDeleteConfirmTitle")}
        message={t("CouponDeleteConfirmMessage")}
        confirmLabel={t("modalDeletBtn")}
      />

      <MainDrawer>
        <CouponDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSubmitForAll}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex flex-wrap items-center"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input ref={searchRef} type="search" name="search" placeholder={t("SearchCoupon")} />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={quickFilter} onChange={(e) => setQuickFilter(e.target.value)}>
                  <option value="">{t("CouponAllStatus")}</option>
                  <option value="active">{t("CouponStatusActive")}</option>
                  <option value="expired">{t("CouponStatusExpired")}</option>
                  <option value="scheduled">{t("CouponStatusScheduled")}</option>
                  <option value="inactive">{t("CouponStatusInactive")}</option>
                  <option value="used">{t("CouponFilterUsed")}</option>
                  <option value="freeShipping">{t("CouponFilterFreeShipping")}</option>
                  <option value="autoApply">{t("CouponFilterAutoApply")}</option>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("FilterBtn") || "Filter"}
                  </Button>
                </div>

                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleResetField}
                    type="reset"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("ResetBtn") || "Reset"}</span>
                  </Button>
                </div>
              </div>

              <div className="w-full md:w-auto">
                <Button
                  type="button"
                  layout={showTrash ? "solid" : "outline"}
                  onClick={handleToggleTrash}
                  className="h-12"
                >
                  {showTrash ? t("CouponBackToList") : t("CouponTrashView")}
                </Button>
              </div>

              {canExportCoupon && (
                <div className="w-full md:w-auto">
                  <Button
                    type="button"
                    layout="outline"
                    onClick={handleExport}
                    disabled={couponList.length === 0}
                    className="h-12"
                  >
                    <span className="mr-2">
                      <FiDownload />
                    </span>
                    {t("CouponExport")}
                  </Button>
                </div>
              )}

              {canCreateCoupon && !showTrash && (
                <div className="w-full md:w-48 lg:w-48 xl:w-48">
                  <Button onClick={() => handleUpdate(null)} className="w-full rounded-md h-12">
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {t("AddCouponsBtn")}
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={9} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : couponList.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>{t("CoupTblCode")}</TableCell>
                <TableCell>{t("CouponDescriptionLabel")}</TableCell>
                <TableCell>{t("CouponTypeTbl")}</TableCell>
                <TableCell>{t("CouponAmountTbl")}</TableCell>
                <TableCell>{t("CouponUsageTbl")}</TableCell>
                <TableCell>{t("CoupTblStartDate")}</TableCell>
                <TableCell>{t("CoupTblEndDate")}</TableCell>
                <TableCell className="text-center">{t("CoupTblStatus")}</TableCell>
                <TableCell className="text-right">{t("CoupTblActions")}</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {couponList.map((coupon) => (
                <TableRow key={coupon._id}>
                  <TableCell>
                    <span className="text-sm font-semibold">{coupon.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm truncate max-w-[160px] block">
                      {coupon.description || "â€”"}

                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {t(DISCOUNT_TYPE_LABEL_KEY[coupon.discountType] || coupon.discountType)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold">{formatAmount(coupon)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatUsage(coupon)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(coupon.startDate)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{formatDate(coupon.endDate)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        STATUS_STYLES[coupon.status] || STATUS_STYLES.inactive
                      }`}
                    >
                      {t(`CouponStatus${coupon.status.charAt(0).toUpperCase()}${coupon.status.slice(1)}`)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-3">
                      {showTrash ? (
                        canUpdateCoupon && (
                          <Button
                            type="button"
                            onClick={() => handleRestore(coupon)}
                            className="text-gray-400 hover:text-emerald-600"
                            title={t("CouponRestore")}
                          >
                            <FiRotateCcw size={16} />
                          </Button>
                        )
                      ) : (
                        <>
                          {((coupon.status === "active" && canDeactivateCoupon) ||
                            (coupon.status !== "active" && canActivateCoupon)) && (
                            <Button
                              type="button"
                              onClick={() => handleToggleStatus(coupon)}
                              className="text-gray-400 hover:text-emerald-600"
                              title={
                                coupon.status === "active"
                                  ? t("CouponDeactivate")
                                  : t("CouponActivate")
                              }
                            >
                              <FiPower size={16} />
                            </Button>
                          )}
                          {canUpdateCoupon && (
                            <Button
                              type="button"
                              onClick={() => handleUpdate(coupon._id)}
                              className="text-gray-400 hover:text-emerald-600"
                              title={t("Edit")}
                            >
                              <FiEdit size={16} />
                            </Button>
                          )}
                          {canDuplicateCoupon && (
                            <Button
                              type="button"
                              onClick={() => handleDuplicate(coupon)}
                              className="text-gray-400 hover:text-blue-600"
                              title={t("CouponDuplicate")}
                            >
                              <FiCopy size={16} />
                            </Button>
                          )}
                          {canDeleteCoupon && (
                            <Button
                              type="button"
                              onClick={() => handleDeleteClick(coupon)}
                              className="text-gray-400 hover:text-red-600"
                              title={t("Delete")}
                            >
                              <FiTrash2 size={16} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableFooter>
            <Pagination
              totalResults={data?.totalDoc || 0}
              resultsPerPage={limitData}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound
          title={showTrash ? "La corbeille est vide." : "Sorry, There are no coupons right now."}
        />
      )}
    </>
  );
};

export default Coupons;
