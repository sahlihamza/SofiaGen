import React from "react";
import { Select } from "@windmill/react-ui";

const SelectField = ({
  label,
  name,
  register,
  required = false,
  options = [],
  defaultOption = "Select option",
  placeholder,
  onChange,
  defaultValue,
  value,
  error,
  className = "",
  id,
  disabled = false,
  children,
  ...rest
}) => {
  const registerProps = register
    ? register(`${name}`, {
        required: required ? `${label || name} is required!` : false,
      })
    : {};

  const { onChange: registerOnChange, ref, ...restRegister } = registerProps || {};

  const handleChange = (event) => {
    if (registerOnChange) {
      registerOnChange(event);
    }
    if (onChange) {
      onChange(event);
    }
  };

  const renderOption = (item) => {
    if (typeof item === "string") {
      return (
        <option key={item} value={item}>
          {item}
        </option>
      );
    }

    return (
      <option key={item.value} value={item.value}>
        {item.label}
      </option>
    );
  };

  return (
    <div className={["mb-3", className].filter(Boolean).join(" ")}>
      {label && (
        <label
          htmlFor={id || name}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Select
          id={id || name}
          name={name}
          defaultValue={defaultValue}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          className="appearance-none pr-12 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:focus:border-emerald-400 dark:focus:ring-emerald-500/20"
          ref={ref}
          {...restRegister}
          {...rest}
        >
          {defaultOption !== null && (
            <option value="" hidden>
              {placeholder || defaultOption}
            </option>
          )}
          {options.map(renderOption)}
          {children}
        </Select>

        <div className="pointer-events-none absolute inset-y-0 right-6 flex items-center">
          <svg
            className="w-3 h-3 text-gray-500 dark:text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </p>
      )}
    </div>
  );
};

export default SelectField;
