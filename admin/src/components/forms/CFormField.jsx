import React from "react";

const CFormField = ({
  label,
  htmlFor,
  children,
  description,
  error,
  required = false,
  className = "",
}) => {
  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {description && (
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}

      <div>{children}</div>

      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </p>
      )}
    </div>
  );
};

export default CFormField;
