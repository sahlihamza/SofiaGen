import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

//internal import
import useGetCData from "@/hooks/useGetCData";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useDisableForDemo from "@/hooks/useDisableForDemo";
import OrderServices from "@/services/OrderServices";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import Loading from "@/components/preloader/Loading";
import AnimatedContent from "@/components/common/AnimatedContent";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import OrderDetailsCard from "@/components/order/OrderDetailsCard";
import OrderStatusCard from "@/components/order/OrderStatusCard";
import OrderNotesCard from "@/components/order/OrderNotesCard";
import { cardClass, secondaryButton } from "@/components/order/OrderCard";

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

/**
 * The order screen: détails  état  notes, in that order, one card each.
 *
 * The order is held here rather than in a fetching hook because every write
 * answers with the order it produced  saving the details, moving the status 
 * so the screen stays in step without a second round trip. Only the details
 * card is rebuilt afterwards (`key={detailsRevision}`): adding a note or
 * changing the status must not throw away edits someone is still typing.
 */
const OrderEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { setIsUpdate } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { handleDisableForDemo } = useDisableForDemo();
  const { showDateFormat, showTimeFormat } = useUtilsFunction();

  const canUpdate = hasPermission("orders", "update");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [detailsRevision, setDetailsRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    OrderServices.getOrderById(id)
      .then((data) => {
        if (cancelled) return;
        setOrder(data);
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Both writes below share this: refuse in demo mode, run, replace the order
  // with what came back, and tell the order list its cache is stale.
  const runWrite = useCallback(
    async (task, successMessage) => {
      if (!canUpdate) {
        notifyError(t("OrderNoUpdatePermission"));
        return false;
      }
      if (handleDisableForDemo()) return false;

      try {
        setIsSaving(true);
        const res = await task();
        if (res?.order) setOrder(res.order);
        setIsUpdate(true);
        notifySuccess(successMessage);
        return true;
      } catch (err) {
        notifyError(errorMessage(err));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [canUpdate, handleDisableForDemo, setIsUpdate, t]
  );

  const handleSaveDetails = async (payload) => {
    const ok = await runWrite(
      () => OrderServices.updateOrderDetails(id, payload),
      t("OrderDetailsSaved")
    );
    // The saved amounts are the server's, and they can differ from the preview
    // by a rounding cent  so the form restarts from what was actually stored.
    if (ok) setDetailsRevision((revision) => revision + 1);
    return ok;
  };

  const handleUpdateStatus = ({ status, comment }) =>
    runWrite(
      () => OrderServices.updateOrder(id, { status, comment }),
      t("OrderStatusUpdated")
    );

  const handleAddNote = async ({ note, type }) => {
    if (!note) {
      notifyError(t("OrderNoteEmpty"));
      return false;
    }
    if (!canUpdate) {
      notifyError(t("OrderNoUpdatePermission"));
      return false;
    }
    if (handleDisableForDemo()) return false;

    try {
      setIsSaving(true);
      const res = await OrderServices.addOrderNote(id, { note, type });
      // Prepended rather than refetched: the details card must not be
      // disturbed by a note being added next to it.
      setOrder((prev) => ({
        ...prev,
        orderNotes: [res.note, ...(prev?.orderNotes || [])],
      }));
      notifySuccess(t("OrderNoteAdded"));
      return true;
    } catch (err) {
      notifyError(errorMessage(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="-mx-2 min-h-full bg-[#f5f5f5] px-2 pb-10 lg:-mx-6 lg:px-6 dark:bg-gray-900">
      <header className="flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to="/orders"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-[#2271b1] hover:underline dark:text-blue-400"
          >
            <FiArrowLeft size={15} />
            {t("OrdersPageHeading")}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#1d2327] dark:text-gray-100">
              {t("OrderColOrder")}
              {order?.invoice ? ` #${order.invoice}` : ""}
            </h1>
            {order && <OrderStatusBadge status={order.status} />}
          </div>

          <p className="mt-1 text-sm text-[#646970] dark:text-gray-400">
            {order ? (
              <>
                {order?.user_info?.name}
                {order?.user_info?.name && "  "}
                {showDateFormat(order.createdAt)} {" "}
                {showTimeFormat(order.createdAt, "HH:mm")}
              </>
            ) : (
              t("OrderEditSubheading")
            )}
          </p>
        </div>

        {order && (
          <Link to={`/order/${id}/invoice`} className={secondaryButton}>
            <FiFileText size={15} />
            {t("OrderActionViewInvoice")}
          </Link>
        )}
      </header>

      {loading ? (
        <div className={`${cardClass} p-8`}>
          <Loading loading={loading} />
        </div>
      ) : error || !order ? (
        <div className={`${cardClass} p-10 text-center text-sm text-rose-500`}>
          {error || t("OrderNotFound")}
        </div>
      ) : (
        <AnimatedContent>
          <div className="space-y-4">
            <OrderDetailsCard
              key={detailsRevision}
              order={order}
              canUpdate={canUpdate}
              isSaving={isSaving}
              onSave={handleSaveDetails}
            />

            <OrderStatusCard
              order={order}
              canUpdate={canUpdate}
              isSaving={isSaving}
              onUpdate={handleUpdateStatus}
            />

            <OrderNotesCard
              order={order}
              canUpdate={canUpdate}
              isSaving={isSaving}
              onAdd={handleAddNote}
            />
          </div>
        </AnimatedContent>
      )}
    </div>
  );
};

export default OrderEdit;
