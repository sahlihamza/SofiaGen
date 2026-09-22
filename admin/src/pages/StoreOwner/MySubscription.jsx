import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FiXCircle,
  FiPackage,
  FiActivity,
  FiRepeat,
  FiDollarSign,
  FiCalendar,
  FiClock,
  FiRefreshCw,
} from "react-icons/fi";
import dayjs from "dayjs";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import SubscriptionServices from "@/services/SubscriptionServices";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";
import useNotification from "@/hooks/useNotification";
import { useStoreContext } from "@/context/StoreContext";
import { Button } from "@sofia/ui";

const STATUS_TONE = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  trial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  canceled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};
const InfoCard = ({ icon: Icon, tone = "bg-gray-500", label, children }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</div>
      </div>
      {Icon && (
        <div className={`rounded-xl p-2 text-white ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  </div>
);

const MySubscription = () => {
  const { t } = useTranslation();
  const { isSuperAdmin, canModule } = useAuthorizationContext();
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const { currentStoreId } = useStoreContext();

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => SubscriptionServices.getMySubscription(),
    enabled: !!currentStoreId,
  });

  const subscription = data?.data;

  const handleCancel = async () => {
    try {
      await SubscriptionServices.cancelSubscription(subscription._id);
      successMessage(t("SubscriptionCanceled") || "Subscription canceled successfully");
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || err?.message || String(err));
    }
  };

  if (!isSuperAdmin && !canModule("subscriptions")) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  const canCancel =
    subscription &&
    subscription.status !== "canceled" &&
    subscription.status !== "cancelled" &&
    subscription.status !== "expired";

  // priceSnapshot.monthly is a real 0 on a free plan â€” `? :` on that value
  // treated 0 as falsy and always fell through to "-" even for a genuine
  // free tier.
  const monthlyPrice = subscription?.priceSnapshot?.monthly;
  const priceLabel =
    monthlyPrice != null
      ? monthlyPrice === 0
        ? t("Free") || "Free"
        : `${monthlyPrice} ${subscription?.priceSnapshot?.currency || "USD"}`
      : "-";

  return (
    <>
      <PageTitle>{t("MySubscription") || "My Subscription"}</PageTitle>

      <AnimatedContent>
        {!currentStoreId ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoStoreSelected") || "No store selected."}</p>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
        ) : subscription ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={FiPackage} tone="bg-blue-500" label={t("Plan") || "Plan"}>
              {subscription.planId?.name || subscription.currentPlanName || "-"}
            </InfoCard>

            <InfoCard icon={FiActivity} tone="bg-emerald-500" label={t("Status") || "Status"}>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_TONE[subscription.status] || STATUS_TONE.canceled}`}>
                {subscription.status}
              </span>
            </InfoCard>

            <InfoCard icon={FiRepeat} tone="bg-violet-500" label={t("BillingCycle") || "Billing Cycle"}>
              {subscription.billingCycle === "yearly" ? t("Yearly") : t("Monthly")}
            </InfoCard>

            <InfoCard icon={FiDollarSign} tone="bg-orange-500" label={t("Price") || "Price"}>
              {priceLabel}
            </InfoCard>

            <InfoCard icon={FiCalendar} tone="bg-cyan-500" label={t("PeriodStart") || "Period Start"}>
              {subscription.currentPeriodStart ? dayjs(subscription.currentPeriodStart).format("DD/MM/YYYY") : "-"}
            </InfoCard>

            <InfoCard icon={FiCalendar} tone="bg-cyan-600" label={t("PeriodEnd") || "Period End"}>
              {subscription.currentPeriodEnd ? dayjs(subscription.currentPeriodEnd).format("DD/MM/YYYY") : "-"}
            </InfoCard>

            <InfoCard icon={FiRefreshCw} tone="bg-teal-500" label={t("AutoRenew") || "Auto Renew"}>
              {subscription.isAutoRenew ? t("Yes") : t("No")}
            </InfoCard>

            <InfoCard icon={FiClock} tone="bg-gray-500" label={t("CreatedAt") || "Created At"}>
              {dayjs(subscription.createdAt).format("DD/MM/YYYY HH:mm")}
            </InfoCard>

            {canCancel && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 flex items-center">
                <Button onClick={handleCancel} className="w-full bg-red-600 hover:bg-red-700">
                  <span className="mr-2 flex items-center"><FiXCircle /></span>
                  {t("Cancel") || "Cancel Subscription"}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoSubscription") || "No subscription found."}</p>
        )}
      </AnimatedContent>
    </>
  );
};

export default MySubscription;
