import { Avatar, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiDollarSign,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiStar,
  FiTruck,
  FiXCircle,
  FiZoomIn,
} from "react-icons/fi";

import AnimatedContent from "@/components/common/AnimatedContent";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import Status from "@/components/table/Status";
import PageTitle from "@/components/Typography/PageTitle";
import RiderServices from "@/services/RiderServices";
import { notifyError } from "@/utils/toast";
import { getRiderImageUrl } from "@/utils/getRiderImageUrl";
import { getTrackingBadgeClasses } from "@/utils/trackingBadge";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@sofia/ui";

const ORDERS_PER_PAGE = 10;

const StatCard = ({ icon: Icon, label, value, bg, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      <Icon size={18} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">{value}</p>
    </div>
  </div>
);

const RiderDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const history = useHistory();
  const { formatMoney } = useCurrency();

  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [totalDoc, setTotalDoc] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let unmounted = false;
    setLoading(true);
    RiderServices.getRiderById(id)
      .then((res) => {
        if (!unmounted) setRider(res?.data || null);
      })
      .catch((err) => notifyError(err?.response?.data?.message || err?.message))
      .finally(() => {
        if (!unmounted) setLoading(false);
      });
    return () => {
      unmounted = true;
    };
  }, [id]);

  useEffect(() => {
    let unmounted = false;
    setOrdersLoading(true);
    RiderServices.getRiderOrders(id, { search, page, limit: ORDERS_PER_PAGE })
      .then((res) => {
        if (unmounted) return;
        setOrders(res?.data || []);
        setTotalDoc(res?.totalDoc || 0);
      })
      .catch((err) => notifyError(err?.response?.data?.message || err?.message))
      .finally(() => {
        if (!unmounted) setOrdersLoading(false);
      });
    return () => {
      unmounted = true;
    };
  }, [id, search, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rider) {
    return <NotFound title={t("RiderNotFoundDetail")} />;
  }

  const isActive = rider.status === "Active";
  const locationParts = [rider.address, rider.city, rider.country].filter(Boolean);

  return (
    <>
      <PageTitle>{rider.name} - {t("RiderDetailsSuffix")}</PageTitle>
      <AnimatedContent>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {rider.name} - {t("RiderDetailsSuffix")}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {t("RiderDetailsSubtitle")}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => history.push("/riders")}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors flex-shrink-0"
          >
            <FiArrowLeft size={16} /> {t("BackToRiders")}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-4">
              {rider.image ? (
                <Avatar className="w-16 h-16" src={getRiderImageUrl(rider.image)} alt={rider.name} />
              ) : (
                <div className="h-16 w-16 rounded-full flex items-center justify-center bg-gray-200 text-xl font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200 flex-shrink-0">
                  {rider.name
                    ?.split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {rider.name}
                </h2>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <FiStar className="text-yellow-400 fill-current" size={13} />
                  {rider.averageRating || 0} ({t("RiderReviewsCount", { count: rider.reviewsCount || 0 })})
                </p>
                <span
                  className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-500"
                  }`}
                >
                  {isActive ? t("RiderActiveBadge") : t("RiderInactiveBadge")}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiMail className="text-gray-400 flex-shrink-0" size={14} />
                <span className="break-all">{rider.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiPhone className="text-gray-400 flex-shrink-0" size={14} />
                <span>{rider.phone || "â€”"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiMapPin className="text-gray-400 flex-shrink-0" size={14} />
                <span>{locationParts.length ? locationParts.join(", ") : "â€”"}</span>

              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiTruck className="text-gray-400 flex-shrink-0" size={14} />
                <span>
                  {rider.vehicleType || "â€”"}

                  {rider.vehicleNumber ? ` - ${rider.vehicleNumber}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard
              icon={FiPackage}
              label={t("RiderDetailTotalDeliveries")}
              value={rider.totalDeliveries || 0}
              bg="#DBEAFE"
              color="#2563EB"
            />
            <StatCard
              icon={FiCheckCircle}
              label={t("RiderDetailCompleted")}
              value={rider.completedDeliveries || 0}
              bg="#D1FAE5"
              color="#059669"
            />
            <StatCard
              icon={FiXCircle}
              label={t("RiderDetailCancelled")}
              value={rider.cancelledDeliveries || 0}
              bg="#FEE2E2"
              color="#DC2626"
            />
            <StatCard
              icon={FiStar}
              label={t("RiderDetailAvgRating")}
              value={rider.averageRating || 0}
              bg="#FEF3C7"
              color="#D97706"
            />
            <StatCard
              icon={FiDollarSign}
              label={t("RiderDetailTotalEarnings")}
              value={formatMoney(rider.totalEarnings || 0)}
              bg="#EDE9FE"
              color="#7C3AED"
            />
            <StatCard
              icon={FiCheckCircle}
              label={t("RiderDetailCurrentAvailability")}
              value={rider.availability}
              bg="#D1FAE5"
              color="#059669"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {t("AssignedOrdersTitle")}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5 mb-4">
            {t("AssignedOrdersSubtitle")}
          </p>

          <div className="mb-4 max-w-sm">
            <Input
              type="search"
              placeholder={t("SearchOrderPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {ordersLoading ? (
            <TableLoading row={6} col={8} width={110} height={16} />
          ) : orders.length !== 0 ? (
            <TableContainer className="mb-4 rounded-b-lg">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>{t("InvoiceTbl")}</TableCell>
                    <TableCell>{t("RiderOrderTrackingIdTbl")}</TableCell>
                    <TableCell>{t("RiderOrderCustomerTbl")}</TableCell>
                    <TableCell>{t("RiderOrderTotalTbl")}</TableCell>
                    <TableCell>{t("OderStatusTbl")}</TableCell>
                    <TableCell>{t("RiderOrderTrackingTbl")}</TableCell>
                    <TableCell>{t("RiderOrderDateTbl")}</TableCell>
                    <TableCell className="text-center">{t("OrderActionsTbl")}</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <span className="text-sm font-medium">#{order.invoice}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{order.trackingId}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{order.user_info?.name || "â€”"}</span>

                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatMoney(order.total || 0)}</span>
                      </TableCell>
                      <TableCell>
                        <Status status={order.status} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTrackingBadgeClasses(
                            order.trackingStatus
                          )}`}
                        >
                          {order.trackingStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("fr-FR")
                            : "â€”"}

                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link
                          to={`/order/${order._id}`}
                          className="text-gray-400 hover:text-emerald-600 inline-flex"
                        >
                          <FiZoomIn size={16} />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TableFooter>
                <Pagination
                  totalResults={totalDoc}
                  resultsPerPage={ORDERS_PER_PAGE}
                  onChange={setPage}
                  label="Orders navigation"
                />
              </TableFooter>
            </TableContainer>
          ) : (
            <NotFound title={t("RiderOrdersNotFound")} />
          )}
        </div>
      </AnimatedContent>
    </>
  );
};

export default RiderDetail;
