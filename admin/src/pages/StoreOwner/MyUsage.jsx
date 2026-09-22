import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { FiLayers, FiCheckCircle, FiAlertTriangle, FiAlertOctagon, FiSlash } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import UsageServices from "@/services/UsageServices";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";

const LEVEL_TONE = {
  normal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  critical: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const levelBadge = (level) => LEVEL_TONE[level] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

const StatCard = ({ icon: Icon, tone, label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      <div className={`rounded-xl p-2 text-white ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const MyUsage = () => {
  const { t } = useTranslation();
  const { isSuperAdmin, canModule } = useAuthorizationContext();

  const { data: summaryData } = useQuery({
    queryKey: ["my-usage-summary"],
    queryFn: () => UsageServices.getSummary(),
    staleTime: 60 * 1000,
  });
  const summary = summaryData?.data || {};

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-usage-counters"],
    queryFn: () => UsageServices.getCounters({ limit: 50 }),
  });

  const counters = data?.data || [];

  if (!isSuperAdmin && !canModule("usage-tracking")) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  const stats = [
    { label: t("TotalCounters") || "Total Counters", value: summary.total || 0, icon: FiLayers, tone: "bg-blue-500" },
    { label: t("Normal") || "Normal", value: summary.normal || 0, icon: FiCheckCircle, tone: "bg-emerald-500" },
    { label: t("Warning") || "Warning", value: summary.warning || 0, icon: FiAlertTriangle, tone: "bg-amber-500" },
    { label: t("Critical") || "Critical", value: summary.critical || 0, icon: FiAlertOctagon, tone: "bg-orange-500" },
    { label: t("Blocked") || "Blocked", value: summary.blocked || 0, icon: FiSlash, tone: "bg-red-500" },
  ];

  return (
    <>
      <PageTitle>{t("MyUsage") || "My Usage"}</PageTitle>

      <AnimatedContent>
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700" />
        ) : error ? (
          <p className="text-sm text-red-500">{error?.response?.data?.message || error?.message || String(error)}</p>
        ) : counters.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("QuotaType") || "Quota Type"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Used") || "Used"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Included") || "Included"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Level") || "Level"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300">{t("Period") || "Period"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {counters.map((counter) => (
                    <tr key={counter._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{counter.quotaTypeCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{counter.used}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{counter.included ?? "-"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${levelBadge(counter.softLimitLevel)}`}>
                          {counter.softLimitLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {dayjs(counter.periodStart).format("DD/MM/YYYY")}  {dayjs(counter.periodEnd).format("DD/MM/YYYY")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("NoUsageData") || "No usage data found."}</p>
        )}
      </AnimatedContent>
    </>
  );
};

export default MyUsage;
