import React from "react";

const CSectionHeader = ({
  title,
  description,
  actions,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  actionClassName = "",
}) => {
  if (!title && !description && !actions) return null;

  return (
    <div className={["flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between", className].filter(Boolean).join(" ")}>
      <div className="min-w-0">
        {title && (
          <h3 className={["text-base font-semibold text-gray-900 dark:text-gray-100", titleClassName].filter(Boolean).join(" ")}>
            {title}
          </h3>
        )}
        {description && (
          <p className={["mt-1 text-sm text-gray-600 dark:text-gray-400", descriptionClassName].filter(Boolean).join(" ")}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className={["flex flex-wrap items-center gap-2", actionClassName].filter(Boolean).join(" ")}>{actions}</div>}
    </div>
  );
};

export default CSectionHeader;
