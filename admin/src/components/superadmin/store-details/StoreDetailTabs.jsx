import React from "react";
import { Button } from "@sofia/ui";


const StoreDetailTabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <Button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-transparent text-gray-600 hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
            }`}
          >
            {Icon && <Icon size={14} />}
            <span>{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default StoreDetailTabs;
