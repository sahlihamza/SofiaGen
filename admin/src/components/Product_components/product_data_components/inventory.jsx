import React from "react";
import { useTranslation } from "react-i18next";

//internal import
import { W, wInput, Field } from "./styles";

const Inventory = ({ register, watch }) => {
  const { t } = useTranslation();
  const manageStock = watch?.("manageStock");

  return (
    <>
      <Field label={t("productForm.sku")} help={t("productForm.skuHelp")}>
        <input type="text" style={wInput} {...register("sku")} />
      </Field>

      <Field label={t("productForm.manageStock")} help={t("productForm.manageStockHelp")}>
        <label
          className="flex items-center gap-2"
          style={{ fontSize: 14, color: W.text, paddingTop: 8 }}
        >
          <input type="checkbox" {...register("manageStock")} />
          {t("productForm.manageStockLabel")}
        </label>
      </Field>

      {manageStock ? (
        <>
          <Field label={t("productForm.stockQuantity")} help={t("productForm.stockQuantityHelp")}>
            <input
              type="number"
              step="1"
              defaultValue={0}
              style={wInput}
              {...register("stockQuantity", { valueAsNumber: true })}
            />
          </Field>

          <Field
            label={t("productForm.allowBackorders")}
            help={t("productForm.allowBackordersHelp")}
          >
            <select {...register("allowBackorders")} style={wInput}>
              <option value="no">{t("productForm.doNotAllow")}</option>
              <option value="notify">{t("productForm.allowButNotify")}</option>
              <option value="yes">{t("productForm.allow")}</option>
            </select>
          </Field>

          <Field
            label={t("productForm.lowStockThreshold")}
            help={t("productForm.lowStockThresholdHelp")}
          >
            <input
              type="number"
              step="1"
              placeholder={t("productForm.lowStockThresholdPlaceholder")}
              style={wInput}
              {...register("lowStockThreshold", { valueAsNumber: true })}
            />
          </Field>
        </>
      ) : (
        <Field label={t("productForm.stockStatus")} help={t("productForm.stockStatusHelp")}>
          <select {...register("stockStatus")} style={wInput}>
            <option value="instock">{t("productForm.inStock")}</option>
            <option value="outofstock">{t("productForm.outOfStock")}</option>
            <option value="onbackorder">{t("productForm.onBackorder")}</option>
          </select>
        </Field>
      )}

      {/* divider */}
      <div
        style={{ borderTop: `1px solid ${W.border}`, margin: "6px 0 18px" }}
      />

      <Field label={t("productForm.soldIndividually")} help={t("productForm.soldIndividuallyHelp")}>
        <label
          className="flex items-center gap-2"
          style={{ fontSize: 14, color: W.text, paddingTop: 8 }}
        >
          <input type="checkbox" {...register("soldIndividually")} />
          {t("productForm.soldIndividuallyLabel")}
        </label>
      </Field>
    </>
  );
};

export default Inventory;
