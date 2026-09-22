import React from "react";

import { useTranslation } from "react-i18next";
import { Input, Select } from "@windmill/react-ui";
import { Button } from "@sofia/ui";

const SearchFilterBar = ({
  searchRef,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onSubmit,
  onReset,
  sortValue,
  onSortChange,
  sortOptions = [],
  statusValue,
  onStatusChange,
  statusOptions = [],
  children,
}) => {
  const { t } = useTranslation();

  return (
    <form
      onSubmit={onSubmit}
      className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex items-center"
    >
      {/* Search Input */}
      <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
        <Input
          ref={searchRef}
          value={searchValue}
          onChange={onSearchChange}
          type="search"
          name="search"
          placeholder={searchPlaceholder || t("SearchPlaceholder")}
        />
      </div>

      {/* Sort Select */}
      {sortOptions.length > 0 && (
        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          <Select
            value={sortValue}
            onChange={(e) => onSortChange && onSortChange(e.target.value)}
          >
            <option value="">{t("SortBy")}</option>
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Status Select */}
      {statusOptions.length > 0 && (
        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          <Select
            value={statusValue}
            onChange={(e) => onStatusChange && onStatusChange(e.target.value)}
          >
            <option value="">{t("AllStatus")}</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Custom Children Filters */}
      {children}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
        <div className="w-full mx-1">
          <Button type="submit" className="h-12 w-full bg-emerald-700 hover:bg-emerald-800">
            {t("FilterBtn")}
          </Button>
        </div>

        {onReset && (
          <div className="w-full">
            <Button
              layout="outline"
              onClick={onReset}
              type="reset"
              className="px-4 md:py-1 py-3 text-sm dark:bg-gray-700"
            >
              <span className="text-black dark:text-gray-200">{t("ResetBtn")}</span>
            </Button>
          </div>
        )}
      </div>
    </form>
  );
};

export default SearchFilterBar;
