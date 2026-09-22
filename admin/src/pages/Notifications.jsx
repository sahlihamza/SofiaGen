import { Badge, Card, CardBody, Input, Select } from "@windmill/react-ui";

import { useEffect, useState } from "react";
import { FiTrash2, FiMail, FiArchive, FiBell } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

//internal import
import ellipse from "@/assets/img/icons/ellipse.svg";
import CheckBox from "@/components/form/input/CheckBox";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { IconButton } from "@/components/ui";

import { notifyError, notifySuccess } from "@/utils/toast";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import NotificationServices from "@/services/NotificationServices";
import useGetCData from "@/hooks/useGetCData";
import { useStoreContext } from "@/context/StoreContext";
import { emitUnreadCountChange } from "@/utils/notificationBus";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { DEFAULT_PAGE_SIZE } from "@/config/tableConfig";
import { Button } from "@sofia/ui";

const TABS = [
  { key: "all", labelKey: "NotifTabAll" },
  { key: "unread", labelKey: "NotifTabUnread" },
  { key: "archived", labelKey: "NotifTabArchived" },
  { key: "orders", labelKey: "NotifTabOrders" },
  { key: "payments", labelKey: "NotifTabPayments" },
  { key: "inventory", labelKey: "NotifTabInventory" },
  { key: "subscriptions", labelKey: "NotifTabSubscriptions" },
  { key: "invoices", labelKey: "NotifTabInvoices" },
  { key: "users", labelKey: "NotifTabUsers" },
  { key: "store", labelKey: "NotifTabStore" },
  { key: "customers", labelKey: "NotifTabCustomers" },
  { key: "reviews", labelKey: "NotifTabReviews" },
  { key: "tickets", labelKey: "NotifTabTickets" },
  { key: "security", labelKey: "NotifTabSecurity" },
  { key: "system", labelKey: "NotifTabSystem" },
];

const PRIORITIES = ["low", "normal", "high", "critical"];
const PRIORITY_KEY = {
  low: "NotifPriorityLow",
  normal: "NotifPriorityNormal",
  high: "NotifPriorityHigh",
  critical: "NotifPriorityCritical",
};

const EVENT_TYPES = [
  "store.created", "store.updated", "store.suspended", "store.activated", "store.deleted",
  "user.created", "user.invited", "user.updated", "user.password_changed",
  "order.created", "order.updated", "order.cancelled", "order.completed",
  "payment.created", "payment.paid", "payment.failed", "payment.refunded",
  "subscription.created", "subscription.renewed", "subscription.expiring", "subscription.expired", "subscription.cancelled",
  "invoice.created", "invoice.paid", "invoice.overdue",
  "product.created", "product.updated", "product.low_stock", "product.out_of_stock",
  "customer.created", "customer.updated",
  "review.created", "review.approved", "review.rejected",
  "ticket.created", "ticket.updated",
  "security.login", "security.new_login", "security.failed_login", "security.password_changed", "security.new_device", "security.alert",
  "system.error",
];

const Notifications = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const canUpdateNotification = hasPermission("Notifications", "update");
  const canDeleteNotification = hasPermission("Notifications", "delete");
  const { stores } = useStoreContext();

  const [data, setData] = useState([]);
  const [totalDoc, setTotalDoc] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("all");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [storeId, setStoreId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isCheck, setIsCheck] = useState([]);
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { showDateTimeFormat } = useUtilsFunction();

  const buildParams = (pg) => {
    const params = { page: pg, limit: DEFAULT_PAGE_SIZE };
    if (priority) params.priority = priority;
    if (type) params.type = type;
    if (storeId) params.filterStoreId = storeId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (tab === "unread") {
      params.status = "unread";
    } else if (tab === "archived") {
      params.status = "archived";
    } else if (tab !== "all") {
      params.category = tab;
    }
    return params;
  };

  const fetchNotifications = async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const res = await NotificationServices.getMyNotifications(buildParams(pg));
      setData((prev) => (append ? [...prev, ...(res?.notifications || [])] : res?.notifications || []));
      setTotalDoc(res?.totalDoc || 0);
      setUnreadCount(res?.unreadCount || 0);
      setPage(pg);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsCheck([]);
    setIsCheckAll(false);
    fetchNotifications(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, priority, type, storeId, dateFrom, dateTo]);

  const handleMarkAsRead = async (id) => {
    try {
      await NotificationServices.markNotificationRead(id);
      emitUnreadCountChange({ delta: -1 });
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleArchive = async (id) => {
    try {
      const wasUnread = data.find((n) => n._id === id)?.status === "unread";
      await NotificationServices.archiveNotification(id);
      if (wasUnread) emitUnreadCountChange({ delta: -1 });
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const wasUnread = data.find((n) => n._id === id)?.status === "unread";
      await NotificationServices.deleteMyNotification(id);
      if (wasUnread) emitUnreadCountChange({ delta: -1 });
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleMarkSelectedRead = async () => {
    try {
      const unreadSelectedCount = data.filter(
        (n) => isCheck.includes(n._id) && n.status === "unread"
      ).length;
      await Promise.all(isCheck.map((id) => NotificationServices.markNotificationRead(id)));
      if (unreadSelectedCount > 0) emitUnreadCountChange({ delta: -unreadSelectedCount });
      notifySuccess(t("NotifMarkedReadSuccess"));
      setIsCheck([]);
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const unreadSelectedCount = data.filter(
        (n) => isCheck.includes(n._id) && n.status === "unread"
      ).length;
      await Promise.all(isCheck.map((id) => NotificationServices.deleteMyNotification(id)));
      if (unreadSelectedCount > 0) emitUnreadCountChange({ delta: -unreadSelectedCount });
      notifySuccess(t("NotifDeletedSuccess"));
      setIsCheck([]);
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationServices.markAllNotificationsRead();
      emitUnreadCountChange({ reset: true });
      notifySuccess(t("NotifAllMarkedReadSuccess"));
      fetchNotifications(1, false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleMarkRead = () => (isCheck?.length > 0 ? handleMarkSelectedRead() : handleMarkAllRead());

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsConfirming(true);
    try {
      if (confirmAction.action === "delete") await handleDelete(confirmAction.id);
      else if (confirmAction.action === "archive") await handleArchive(confirmAction.id);
      else if (confirmAction.action === "deleteSelected") await handleDeleteSelected();
    } finally {
      setIsConfirming(false);
      setConfirmAction(null);
    }
  };

  const confirmModalContent = () => {
    if (!confirmAction) return {};
    if (confirmAction.action === "delete") {
      return {
        title: t("NotifDeleteConfirmTitle"),
        message: t("NotifDeleteConfirmMessage"),
        confirmLabel: t("NotifDeleteTitle"),
      };
    }
    if (confirmAction.action === "archive") {
      return {
        title: t("NotifArchiveConfirmTitle"),
        message: t("NotifArchiveConfirmMessage"),
        confirmLabel: t("NotifArchiveTitle"),
      };
    }
    return {
      title: t("NotifDeleteSelectedConfirmTitle"),
      message: t("NotifDeleteSelectedConfirmMessage", { count: isCheck.length }),
      confirmLabel: t("NotifDeleteSelected"),
    };
  };

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(isCheckAll ? [] : (Array.isArray(data) ? data : []).map((li) => li._id));
  };

  const handleClick = (e) => {
    const { id, checked } = e.target;
    if (checked) {
      setIsCheck((prev) => [...prev, id]);
    } else {
      setIsCheck((prev) => prev.filter((item) => item !== id));
    }
  };

  const columns = [
    {
      key: "select",
      header: (
        <CheckBox
          type="checkbox"
          name="selectAll"
          id="selectAll"
          handleClick={handleSelectAll}
          isChecked={isCheckAll}
        />
      ),
      sortable: false,
    },
    { key: "notification", header: t("NotifColNotification"), sortable: false },
    { key: "category", header: t("NotifColCategory"), sortable: false },
    { key: "priority", header: t("NotifColPriority"), sortable: false },
    { key: "date", header: t("NotifColDate"), sortable: false },
    { key: "actions", header: "", sortable: false },
  ];

  return (
    <>
      <ConfirmActionModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        isSubmitting={isConfirming}
        {...confirmModalContent()}
      />

      <PageTitle>{t("NotifPageTitle")}</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-4">
            {TABS.map((tabItem) => (
              <Button
                key={tabItem.key}
                type="button"
                onClick={() => setTab(tabItem.key)}
                variant={tab === tabItem.key ? "primary" : "outline"}
                size="sm"
              >
                {t(tabItem.labelKey)}
              </Button>
            ))}
          </div>


          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchNotifications(1, false);
            }}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex flex-wrap items-center"
          >
            <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title={t("NotifDateFrom")}
              />
              <span className="text-gray-400 text-sm">â†’</span>

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title={t("NotifDateTo")}
              />
            </div>

            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{t("NotifAllTypes")}</option>
                {EVENT_TYPES.map((evt) => (
                  <option key={evt} value={evt}>
                    {evt}
                  </option>
                ))}
              </Select>
            </div>

            {Array.isArray(stores) && stores.length > 1 && (
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                  <option value="">{t("NotifAllStores")}</option>
                  {stores.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">{t("NotifAllPriorities")}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t(PRIORITY_KEY[p])}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <div className="w-full mx-1">
                <Button type="submit" className="h-12 w-full bg-emerald-700">
                  {t("FilterBtn")}
                </Button>
              </div>

              <div className="w-full mx-1">
                <Button
                  layout="outline"
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setType("");
                    setStoreId("");
                    setPriority("");
                  }}
                  className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                >
                  <span className="text-black dark:text-gray-200">{t("ResetBtn")}</span>
                </Button>
              </div>
            </div>
          </form>

          <div className="flex justify-between flex-wrap gap-2 mt-2">
            {canUpdateNotification && (
              <Button
                disabled={unreadCount < 1 && isCheck?.length < 1}
                onClick={handleMarkRead}
                className="h-10 px-4 bg-emerald-700"
              >
                <FiMail className="mr-2" />
                {t("NotifMarkAsRead")}
              </Button>
            )}

            {canDeleteNotification && (
              <Button
                disabled={isCheck?.length < 1}
                onClick={() => setConfirmAction({ action: "deleteSelected" })}
                className="h-10 px-4 bg-red-600 hover:bg-red-700"
              >
                <FiTrash2 className="mr-2" />
                {t("NotifDeleteSelected")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody style={{ padding: 0 }}>
          <div className="px-6 pt-4 dark:text-gray-300">
            <p className="text-sm font-semibold text-emerald-600">
              {t("NotifUnreadCount")} ({unreadCount})
            </p>
          </div>

          {loading ? (
            <TableLoading row={8} col={5} />
          ) : data.length === 0 ? (
            <NotFound title={t("NotifNotFound")} />
          ) : (
            <>
              <SortableDataTable
                columns={columns}
                rows={data}
                getRowKey={(row) => row._id}
                renderCell={({ row, column }) => {
                  switch (column.key) {
                    case "select":
                      return (
                        <CheckBox
                          type="checkbox"
                          name={row?._id}
                          id={row._id}
                          handleClick={handleClick}
                          isChecked={isCheck?.includes(row._id)}
                        />
                      );
                    case "notification":
                      return (
                        <Link
                          to={
                            row.actionUrl
                              ? row.actionUrl
                              : row.productId
                              ? `/product/${row.productId}`
                              : row.orderId
                              ? `/order/${row.orderId}`
                              : row.couponId
                              ? "/coupons"
                              : "#"
                          }
                          className="flex items-center"
                          onClick={() => row.status === "unread" && handleMarkAsRead(row._id)}
                        >
                          <span className="hidden md:flex items-center justify-center w-9 h-9 mr-3 rounded-full bg-gray-50 dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <FiBell className="w-4 h-4" />
                          </span>
                          <div>
                            <h2 className="text-sm font-medium">
                              {row?.title || row?.message}
                            </h2>
                            <p className="text-xs text-gray-400 dark:text-gray-400">
                              {row?.message}
                            </p>
                          </div>
                          {row.status === "unread" && (
                            <span className="px-2 md:flex hidden focus:outline-none text-emerald-600">
                              <img src={ellipse} width={12} height={12} alt="ellipse" className="w-3 h-3" />
                            </span>
                          )}
                        </Link>
                      );
                    case "category":
                      return row.category === "tickets" ? (
                      <Badge type="primary">
                        <span className="capitalize">Ticket</span>
                      </Badge>
                    ) : (
                      <Badge type="neutral">
                        <span className="capitalize">{row.category || row.type || "notification"}</span>
                      </Badge>
                    );
                    case "priority":
                      return (
                        <Badge
                          type={
                            row.priority === "critical" || row.priority === "high"
                              ? "danger"
                              : row.priority === "normal"
                              ? "success"
                              : "warning"
                          }
                        >
                          <span className="capitalize">
                            {PRIORITY_KEY[row.priority] ? t(PRIORITY_KEY[row.priority]) : row.priority}
                          </span>
                        </Badge>
                      );
                    case "date":
                      return <span className="text-sm">{showDateTimeFormat(row?.createdAt)}</span>;
                    case "actions":
                      return (
                        <div className="flex justify-end gap-1">
                          {canUpdateNotification && row.status !== "archived" && (
                            <IconButton
                              icon="archive"
                              onClick={() => setConfirmAction({ action: "archive", id: row._id })}
                              aria-label="Archive"
                              title={t("NotifArchiveTitle")}
                            />
                          )}
                          {canDeleteNotification && (
                            <IconButton
                              icon="trash"
                              onClick={() => setConfirmAction({ action: "delete", id: row._id })}
                              aria-label="Delete"
                              title={t("NotifDeleteTitle")}
                            />
                          )}
                        </div>
                      );
                    default:
                      return row[column.key];
                  }
                }}
              />

              {totalDoc > data.length && (
                <div className="text-center py-3 w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fetchNotifications(page + 1, true)}
                    className="text-emerald-700 dark:text-emerald-400"
                  >
                    {t("NotifSeeMore")}
                  </Button>
                </div>
              )}

            </>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default Notifications;
