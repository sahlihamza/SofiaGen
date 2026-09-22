import React from "react";

const CInfoList = ({ items = [], className = "" }) => {
  if (!items.length) return null;

  return (
    <dl className={["space-y-3", className].filter(Boolean).join(" ")}>
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className="flex flex-col gap-1 border-b border-gray-200 py-3 last:border-b-0 dark:border-gray-700"
        >
          <dt className="text-sm font-semibold text-gray-600 dark:text-gray-400">{item.label}</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default CInfoList;
