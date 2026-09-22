import React from "react";
import { useTranslation } from "react-i18next";

const PlanHistoryTimeline = ({ logs = [] }) => {
  const { t } = useTranslation();

  if (logs.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
        {t("NoHistory") || "No history entries found."}
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((entry, index) => (
        <div key={entry._id || index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
            {index < logs.length - 1 && (
              <div className="w-0.5 bg-gray-200 dark:bg-gray-700 flex-1 min-h-[24px]" />
            )}
          </div>
          <div className="pb-4 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {entry.action || "Change"}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {entry.createdAt
                  ? new Date(entry.createdAt).toLocaleString()
                  : "-"}
              </span>
            </div>
            {entry.summary && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {entry.summary}
              </p>
            )}
            {entry.userId && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t("By") || "By"} {entry.userId?.name || entry.userId?.email || "-"}
              </p>
            )}
            {entry.fieldChanges && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(entry.fieldChanges, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlanHistoryTimeline;
