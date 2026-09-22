import React from "react";

const PageWrapper = ({
  children,
  title,
  description,
  actions,
  breadcrumb,
  badge,
  className = "",
  contentClassName = "",
  fullWidth = false,
  id,
  titleId,
  descriptionId,
}) => {
  const headingId = titleId || (id ? `${id}-title` : undefined);
  const contentDescriptionId = descriptionId || (id ? `${id}-description` : undefined);
  const wrapperClassName = [
    "w-full",
    fullWidth ? "max-w-none" : "mx-auto",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasHeader = Boolean(title || description || actions || breadcrumb || badge);

  return (
    <section id={id} className={wrapperClassName} aria-labelledby={headingId}>
      {hasHeader && (
        <header className="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
              {badge && <div className="mb-2">{badge}</div>}
              {title && (
                <h1
                  id={headingId}
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h1>
              )}
              {description && (
                <p
                  id={contentDescriptionId}
                  className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                >
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {actions}
              </div>
            )}
          </div>
        </header>
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
};

export default PageWrapper;
