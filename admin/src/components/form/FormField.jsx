import React from "react";
import Error from "@/components/form/others/Error";

const FormField = ({
  label,
  required = false,
  error,
  helpText,
  className = "",
  children,
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <Error errorName={error} />}
      {helpText && (
        <p className="text-xs text-gray-400 mt-1">{helpText}</p>
      )}
    </div>
  );
};

export default FormField;
