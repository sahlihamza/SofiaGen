import { useEffect, useState } from "react";
import { Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";

//internal import
import CouponServices from "@/services/CouponServices";
import { notifyError } from "@/utils/toast";

const STATUS_STYLES = {
  applied: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-red-50 text-red-500",
  refunded: "bg-amber-50 text-amber-600",
};

const RESULTS_PER_PAGE = 10;

const CouponUsageHistory = ({ id, isActive }) => {
  const { t } = useTranslation();
  const [usages, setUsages] = useState([]);
  const [totalDoc, setTotalDoc] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!id || !isActive) return;

    (async () => {
      try {
        setIsLoading(true);
        const res = await CouponServices.getCouponUsages(id, {
          page: currentPage,
          limit: RESULTS_PER_PAGE,
        });
        setUsages(res?.data || []);
        setTotalDoc(res?.totalDoc || 0);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, isActive, currentPage]);

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "â€”";


  return (
    <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
      <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
        <p className="text-sm text-gray-400 mb-6">{t("CouponUsageHistoryHelpText")}</p>

        {isLoading ? (
          <div className="text-sm text-gray-400">{t("Processing")}</div>
        ) : usages.length === 0 ? (
          <div className="text-sm text-gray-400">{t("CouponUsageHistoryEmpty")}</div>
        ) : (
          <TableContainer className="mb-6">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("CouponUsageCustomerTbl")}</TableCell>
                  <TableCell>{t("CouponUsageOrderTbl")}</TableCell>
                  <TableCell>{t("CouponUsageDateTbl")}</TableCell>
                  <TableCell>{t("CouponUsageDiscountTbl")}</TableCell>
                  <TableCell className="text-center">{t("CouponUsageStatusTbl")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {usages.map((usage) => (
                  <TableRow key={usage._id}>
                    <TableCell>
                      <span className="text-sm">
                        {usage.customerId?.name || usage.customerId?.email || "â€”"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {usage.orderId?.invoice ? `#${usage.orderId.invoice}` : "â€”"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(usage.usedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold">{usage.discountAmount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLES[usage.status] || STATUS_STYLES.applied
                        }`}
                      >
                        {t(`CouponUsageStatus_${usage.status}`)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TableFooter>
              <Pagination
                totalResults={totalDoc}
                resultsPerPage={RESULTS_PER_PAGE}
                onChange={setCurrentPage}
                label="Coupon usage history navigation"
              />
            </TableFooter>
          </TableContainer>
        )}
      </div>
    </Scrollbars>
  );
};

export default CouponUsageHistory;
