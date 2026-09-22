import React from "react";
import { Button } from "@sofia/ui";

const CTabSwitcher = ({ tabs = [], activeTab, onChange, className = "" }) => {
  if (!tabs.length) return null;

  return (
    <div className={["flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;
        return (
          <Button
            key={tab.value}
            type="button"
            variant={isActive ? "primary" : "outline"}
            size="sm"
            onClick={() => onChange?.(tab.value)}
            className="rounded-full px-3 py-1.5 font-medium"
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
};

export default CTabSwitcher;
