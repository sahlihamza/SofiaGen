import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import CSectionHeader from "@/components/common/CSectionHeader";
import Button from "@/components/ui/CButton";
import { notifySuccess, notifyError } from "@/utils/toast";
import ReturnRequestServices from "@/services/ReturnRequestServices";
import { Button } from "@sofia/ui";

/* -------------------------------------------------------------------------
 * Returns (RMA) â€” admin list + state-machine actions.
 * Every action below hits a real backend transition (ReturnRequestService)
 * that enforces the same rules server-side (illegal jumps rejected, receive
 * restocks via StockMovement, refund creates a real PaymentRefund) â€” this

 * screen has no logic of its own beyond calling the right endpoint.
 * ---------------------------------------------------------------------- */

const STATUS_STYLES = {
  requested: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  approved: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  awaiting_return: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  received: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  refunded: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  exchanged: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_FILTERS = ["all", "requested", "approved", "awaiting_return", "received", "refunded", "rejected"];

const Returns = () => {
  const { t } = useTranslation();
  const [storeId] = useState(Cookies.get("company") || null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    if (!storeId) return;
    try {
      setIsLoading(true);
      const res = await ReturnRequestServices.getReturnRequests(storeId, {
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setItems(res?.items || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || "Failed to load return requests");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, statusFilter]);

  const runAction = async (id, action, ...args) => {
    try {
      setActingId(id);
      await action(storeId, id, ...args);
      notifySuccess("Return request updated");
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || "Action failed");
    } finally {
      setActingId(null);
    }
  };

  const actionsFor = (rr) => {
    const disabled = actingId === rr._id;
    switch (rr.status) {
      case "requested":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={disabled} onClick={() => runAction(rr._id, ReturnRequestServices.approve)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              disabled={disabled}
              onClick={() => runAction(rr._id, ReturnRequestServices.reject, "Rejected by merchant")}
            >
              Reject
            </Button>
          </div>
        );
      case "approved":
        return (
          <Button size="sm" variant="primary" disabled={disabled} onClick={() => runAction(rr._id, ReturnRequestServices.markAwaitingReturn)}>
            Mark awaiting return
          </Button>
        );
      case "awaiting_return":
        return (
          <Button size="sm" variant="primary" disabled={disabled} onClick={() => runAction(rr._id, ReturnRequestServices.markReceived)}>
            Mark received (restock)
          </Button>
        );
      case "received":
        return (
          <Button size="sm" variant="primary" disabled={disabled} onClick={() => runAction(rr._id, ReturnRequestServices.refund)}>
            Refund
          </Button>
        );
      default:
        return <span className="text-xs text-gray-400 dark:text-gray-500">No action</span>;
    }
  };

  return (
    <main className="flex flex-1 flex-col sm:px-4 bg-gray-50 dark:bg-gray-900 peer-[.header-fixed]/header:mt-16">
      <div className="w-full min-h-full flex-1 pt-8 pb-8 px-4 sm:px-6 lg:px-8">
        <CSectionHeader
          title={t("Returns") || "Returns"}
          description={t("ReturnsDescription") || "Customer return (RMA) requests and their resolution."}
          className="pb-0"
        />

        <div className="mt-4 flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              }`}
            >
              {s.replace("_", " ")}
            </Button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">No return requests found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Requested</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((rr) => (
                  <tr key={rr._id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {rr.orderId?.orderNumber || rr.orderId?._id || rr.orderId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {rr.items?.length || 0} item(s)
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[rr.status] || ""}`}>
                        {rr.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(rr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">{actionsFor(rr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
};

export default Returns;
