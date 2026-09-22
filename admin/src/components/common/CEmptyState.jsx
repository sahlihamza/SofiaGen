import React from "react";

const EmptyState = ({
  title = "No data",
  description = "There is no data to display yet.",
  icon = null,
  action = null,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
}) => {
  return (
    <div className={["flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-800/60", className].filter(Boolean).join(" ")}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      <h3 className={["text-base font-semibold text-gray-900 dark:text-gray-100", titleClassName].filter(Boolean).join(" ")}>{title}</h3>
      <p className={["mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400", descriptionClassName].filter(Boolean).join(" ")}>{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
