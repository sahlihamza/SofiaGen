import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import Error from "@/components/form/others/Error";
import ShippingClassServices from "@/services/ShippingClassServices";
import { wInput, Field } from "./styles";

const Shipping = ({ register, errors }) => {
  const { t } = useTranslation();
  const [shippingClasses, setShippingClasses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ShippingClassServices.getAllShippingClasses();
        setShippingClasses(Array.isArray(res) ? res : res?.data || []);
      } catch {
        setShippingClasses([]);
      }
    })();
  }, []);

  return (
    <>
      <Field label={t("productForm.weight")} help={t("productForm.weightHelp")}>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          style={wInput}
          {...register("weight", {
            valueAsNumber: true,
            validate: (v) =>
              v == null ||
              Number.isNaN(v) ||
              v > 0 ||
              t("productForm.weightPositive"),
          })}
        />
        <Error errorName={errors?.weight} />
      </Field>

      <Field
        label={t("productForm.dimensions")}
        help={t("productForm.dimensionsHelp")}
      >
        <div className="flex items-start gap-2">
          <div style={{ flex: 1 }}>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={t("productForm.length")}
              style={wInput}
              {...register("dimensions.length", {
                valueAsNumber: true,
                validate: (v) =>
                  v == null ||
                  Number.isNaN(v) ||
                  v > 0 ||
                  t("productForm.lengthPositive"),
              })}
            />
            <Error errorName={errors?.dimensions?.length} />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={t("productForm.width")}
              style={wInput}
              {...register("dimensions.width", {
                valueAsNumber: true,
                validate: (v) =>
                  v == null ||
                  Number.isNaN(v) ||
                  v > 0 ||
                  t("productForm.widthPositive"),
              })}
            />
            <Error errorName={errors?.dimensions?.width} />
          </div>
          <div style={{ flex: 1 }}>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={t("productForm.height")}
              style={wInput}
              {...register("dimensions.height", {
                valueAsNumber: true,
                validate: (v) =>
                  v == null ||
                  Number.isNaN(v) ||
                  v > 0 ||
                  t("productForm.heightPositive"),
              })}
            />
            <Error errorName={errors?.dimensions?.height} />
          </div>
        </div>
      </Field>

      <Field
        label={t("productForm.shippingClass")}
        help={t("productForm.shippingClassHelp")}
      >
        <select {...register("shippingClassId")} style={wInput}>
          <option value="">{t("productForm.noShippingClass")}</option>
          {shippingClasses.map((shippingClass) => (
            <option key={shippingClass._id} value={shippingClass._id}>
              {shippingClass.name}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
};

export default Shipping;
