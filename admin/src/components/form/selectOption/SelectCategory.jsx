import React from "react";
import useAsync from "@/hooks/useAsync";
import CategoryServices from "@/services/CategoryServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import SelectField from "@/components/form/selectOption/SelectField";
import { useTranslation } from "react-i18next";

const SelectCategory = ({ setCategory, name = "category", required = false }) => {
  const { t } = useTranslation();
  const { data } = useAsync(CategoryServices.getAllCategories);
  const { showingTranslateValue } = useUtilsFunction();

  const options = (data || []).map((cat) => ({
    value: cat._id,
    label: showingTranslateValue(cat?.name),
  }));

  return (
    <SelectField
      label={t("Category") || "Category"}
      name={name}
      options={options}
      placeholder={t("Category") || "Category"}
      required={required}
      onChange={(e) => setCategory?.(e.target.value)}
    />
  );
};

export default SelectCategory;
