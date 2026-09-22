import React from "react";
import { Button } from "@sofia/ui";

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search",
  label = "Search",
  name = "search",
  className = "",
  inputClassName = "",
  buttonLabel = "Search",
  onSearch,
  disabled = false,
  leftIcon = null,
  rightContent = null,
  ariaLabel,
}) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSearch) {
      onSearch(value);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className} role="search">
      <label htmlFor={name} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-blue-400 dark:focus-within:ring-blue-900/40">
        {leftIcon && <span className="text-gray-400">{leftIcon}</span>}
        <input
          id={name}
          name={name}
          type="search"
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel || label}
          className={["w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100", inputClassName].filter(Boolean).join(" ")}
        />
        {rightContent}
        {onSearch && (
          <Button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
          >
            {buttonLabel}
          </Button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
