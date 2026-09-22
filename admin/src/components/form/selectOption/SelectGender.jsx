import React from "react";
import { Select } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

const SelectGender = ({ register, name = "gender", required = false }) => {
  const { t } = useTranslation();

  return (
    <Select
      name={name}
      {...register(`${name}`, {
        required: required ? t("ProfileGenderRequired") : false,
      })}
      className="h-12 mb-3"
    >
      <option value="">{t("SelectGenderPlaceholder")}</option>
      <option value="Male">{t("GenderMale")}</option>
      <option value="Female">{t("GenderFemale")}</option>
    </Select>
  );
};

export default SelectGender;
