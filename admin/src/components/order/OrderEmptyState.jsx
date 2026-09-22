import { IoBagHandleOutline } from "react-icons/io5";

const OrderEmptyState = ({ title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0f0f1] text-2xl text-[#8c8f94] dark:bg-gray-700 dark:text-gray-400">
      <IoBagHandleOutline />
    </span>
    <h3 className="text-base font-semibold text-[#1d2327] dark:text-gray-200">
      {title}
    </h3>
    {description && (
      <p className="mt-1 max-w-md text-sm text-[#646970] dark:text-gray-400">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default OrderEmptyState;
