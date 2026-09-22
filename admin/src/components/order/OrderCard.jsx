// The shell the three sections of the order screen share — Détails, État,
// Notes — so they read as one page rather than three components that happen to
// sit under each other. The class strings live here for the same reason: one
// definition of what a field, a button or a table header looks like.

export const cardClass =
  "overflow-hidden rounded-lg border border-[#dcdcde] bg-white dark:border-gray-700 dark:bg-gray-800";

export const fieldClass =
  "h-10 w-full rounded-md border border-[#dcdcde] bg-white px-3 text-sm text-[#1d2327] placeholder-[#8c8f94] transition-colors focus:border-[#2271b1] focus:outline-none focus:ring-1 focus:ring-[#2271b1] disabled:cursor-not-allowed disabled:bg-[#f6f7f7] disabled:text-[#8c8f94] dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 dark:disabled:bg-gray-900/40";

export const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400";

export const buttonBase =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} bg-[#2271b1] text-white hover:bg-[#135e96] focus:ring-2 focus:ring-[#2271b1] focus:ring-offset-1 dark:focus:ring-offset-gray-800`;

export const secondaryButton = `${buttonBase} border border-[#dcdcde] bg-white text-[#1d2327] hover:border-[#2271b1] hover:text-[#2271b1] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-blue-400 dark:hover:text-blue-400`;

export const tableHeadCell =
  "whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400";

export const OrderCardSection = ({ title, children, className = "" }) => (
  <section className={`border-t border-[#f0f0f1] p-5 dark:border-gray-700 ${className}`}>
    {title && (
      <h3 className="mb-4 text-sm font-semibold text-[#1d2327] dark:text-gray-200">
        {title}
      </h3>
    )}
    {children}
  </section>
);

const OrderCard = ({ icon, title, description, aside, children }) => (
  <section className={cardClass}>
    <header className="flex flex-col gap-3 border-b border-[#dcdcde] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#f0f6fc] text-[#2271b1] dark:bg-blue-500/10 dark:text-blue-400">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-[#1d2327] dark:text-gray-100">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-[#646970] dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>

    {children}
  </section>
);

export default OrderCard;
