import React from "react";
import { useTranslation } from "react-i18next";

//internal import
import { W, wInput, Field } from "./styles";

const Advanced = ({ register }) => {
  const { t } = useTranslation();
  return (
    <>
      <Field
        label={t("productForm.purchaseNote")}
        help={t("productForm.purchaseNoteHelp")}
      >
        <textarea
          rows={4}

          style={{ ...wInput, height: "auto", padding: "8px", resize: "vertical" }}
          {...register("purchaseNote")}
        />
      </Field>

      <Field
        label={t("productForm.enableReviews")}
        help={t("productForm.enableReviewsHelp")}
      >
        <label
          className="flex items-center gap-2"
          style={{ fontSize: 14, color: W.text, paddingTop: 8 }}
        >
          <input type="checkbox" {...register("enableReviews")} />
          {t("productForm.allowCustomerReviews")}
        </label>
      </Field>

      <Field
        label={t("productForm.menuOrder")}
        help={t("productForm.menuOrderHelp")}
      >
        <input
          type="number"
          step="1"
          placeholder="0"
          style={wInput}
          {...register("menuOrder", { valueAsNumber: true })}
        />

      </Field>
    </>
  );
};

export default Advanced;
