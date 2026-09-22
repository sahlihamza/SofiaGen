import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import OrderServices from "@/services/OrderServices";
import useDisableForDemo from "@/hooks/useDisableForDemo";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";

const errorMessage = (err) =>
  err?.response?.data?.message || err?.message || "Something went wrong";

// Every write the order screens perform, in one place: status changes and
// deletes, single or bulk. `setIsUpdate` is what makes useAsync refetch, so it
// is flipped once per action rather than once per order.
const useOrderActions = () => {
  const { setIsUpdate } = useContext(SidebarContext);
  const { handleDisableForDemo } = useDisableForDemo();
  const { t } = useTranslation();

  const [isRunning, setIsRunning] = useState(false);

  const runBulk = async (ids, task) => {
    const results = await Promise.allSettled(ids.map(task));
    const failed = results.filter((r) => r.status === "rejected");

    return { succeeded: ids.length - failed.length, failed };
  };

  const changeStatus = async (id, status) => {
    if (handleDisableForDemo()) return false;

    try {
      setIsRunning(true);
      const res = await OrderServices.updateOrder(id, { status });
      setIsUpdate(true);
      notifySuccess(res?.message || t("OrderStatusUpdated"));
      return true;
    } catch (err) {
      notifyError(errorMessage(err));
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  const changeStatusMany = async (ids, status) => {
    if (handleDisableForDemo()) return false;

    try {
      setIsRunning(true);
      const { succeeded, failed } = await runBulk(ids, (id) =>
        OrderServices.updateOrder(id, { status })
      );

      if (succeeded > 0) {
        setIsUpdate(true);
        notifySuccess(
          t("OrderBulkStatusUpdated", {
            total: succeeded,
            defaultValue: `${succeeded} commande(s) mise(s)  jour`,
          })
        );
      }
      if (failed.length > 0) notifyError(errorMessage(failed[0].reason));

      return failed.length === 0;
    } finally {
      setIsRunning(false);
    }
  };

  const removeOrder = async (id) => {
    if (handleDisableForDemo()) return false;

    try {
      setIsRunning(true);
      const res = await OrderServices.deleteOrder(id);
      setIsUpdate(true);
      notifySuccess(res?.message || t("OrderDeleted"));
      return true;
    } catch (err) {
      notifyError(errorMessage(err));
      return false;
    } finally {
      setIsRunning(false);
    }
  };

  const removeOrderMany = async (ids) => {
    if (handleDisableForDemo()) return false;

    try {
      setIsRunning(true);
      const { succeeded, failed } = await runBulk(ids, (id) =>
        OrderServices.deleteOrder(id)
      );

      if (succeeded > 0) {
        setIsUpdate(true);
        notifySuccess(
          t("OrderBulkDeleted", {
            total: succeeded,
            defaultValue: `${succeeded} commande(s) supprimée(s)`,
          })
        );
      }
      if (failed.length > 0) notifyError(errorMessage(failed[0].reason));

      return failed.length === 0;
    } finally {
      setIsRunning(false);
    }
  };

  return {
    isRunning,
    changeStatus,
    changeStatusMany,
    removeOrder,
    removeOrderMany,
  };
};

export default useOrderActions;
