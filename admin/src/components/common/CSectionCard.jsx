import React from "react";

const SectionCard = ({
  children,
  title,
  description,
  actions,
  footer,
  className = "",
  contentClassName = "",
  headerClassName = "",
  titleClassName = "",
  descriptionClassName = "",
  rounded = true,
  bordered = true,
  shadow = true,
  id,
  titleId,
  descriptionId,
}) => {
  const cardClasses = [
    "w-full bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100",
    rounded ? "rounded-lg" : "",
    bordered ? "border border-gray-200 dark:border-gray-700" : "",
    shadow ? "shadow-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const header = title || description || actions;

  return (
    <section id={id} className={cardClasses} aria-labelledby={titleId}>
      {header && (
        <div className={["border-b border-gray-200 p-4 dark:border-gray-700 sm:p-5", headerClassName].filter(Boolean).join(" ")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className={["text-base font-semibold", titleClassName].filter(Boolean).join(" ")}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className={["mt-1 text-sm text-gray-600 dark:text-gray-400", descriptionClassName].filter(Boolean).join(" ")}
                >
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}

      <div className={["p-4 sm:p-5", contentClassName].filter(Boolean).join(" ")}>{children}</div>

      {footer && <div className="border-t border-gray-200 p-4 dark:border-gray-700 sm:px-5 sm:py-4">{footer}</div>}
    </section>
  );
};

export default SectionCard;
