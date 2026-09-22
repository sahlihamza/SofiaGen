import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCalendar } from "react-icons/fi";

//internal import
import Error from "@/components/form/others/Error";
import { isValidSaleRange } from "@/utils/salePrice";
import { W, wInput, Field } from "./styles";
import { Button } from "@sofia/ui";

// Date input styled like the rest of the product form. The native calendar
// button is made transparent in CSS and stretched over the right edge, so the
// FiCalendar drawn underneath is what the user sees while the click still
// opens the browser's own picker â€” no JS, no third-party datepicker.
//
// `isEmpty` also drives a CSS rule that hides the native "mm/dd/yyyy" text, so
// the YYYY-MM-DD placeholder below is the only thing showing on an empty field.
const DateInput = ({ registration, isEmpty }) => (
  <div style={{ position: "relative" }}>
    <input
      type="date"
      className={`wc-date-input${isEmpty ? " is-empty" : ""}`}
      style={{ ...wInput, paddingRight: 32 }}
      {...registration}
    />
    {isEmpty && (
      <span
        style={{
          position: "absolute",
          left: 9,
          top: 0,
          height: 36,
          display: "flex",
          alignItems: "center",
          fontSize: 14,
          color: W.textSecondary,
          pointerEvents: "none",
        }}
      >
        YYYY-MM-DD
      </span>
    )}
    <FiCalendar
      size={15}
      style={{
        position: "absolute",
        right: 10,
        top: 10,
        color: W.textSecondary,
        pointerEvents: "none",
      }}
    />
  </div>
);

const General = ({ register, errors, watch }) => {
  const { t } = useTranslation();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const saleStart = watch?.("saleStart") || "";
  const saleEnd = watch?.("saleEnd") || "";

  // Shown live rather than only on submit, so the mistake is visible while the
  // second date is still being picked. The same rule is registered below as a
  // validate() so it also blocks the submit.
  const rangeInvalid = !isValidSaleRange(saleStart, saleEnd);

  return (
    <>
      <Field
        label={t("productForm.regularPrice")}
        help={t("productForm.regularPriceHelp")}
        required
        requiredTitle={t("productForm.requiredField")}
      >
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          style={wInput}
          {...register("regularPrice", {
            required: t("productForm.regularPriceRequired"),
            min: 0,
            valueAsNumber: true,
          })}
        />
        <Error errorName={errors.regularPrice} />
      </Field>

      <Field label={t("productForm.salePrice")} help={t("productForm.salePriceHelp")}>
        <input
          type="number"
          step="0.01"
          placeholder="0.00"
          style={wInput}
          {...register("salePrice", { min: 0, valueAsNumber: true })}
        />
        <Error errorName={errors.salePrice} />

        <Button
          type="button"
          onClick={() => setScheduleOpen((v) => !v)}
          className="wc-schedule-link"
          aria-expanded={scheduleOpen}
          style={{
            marginTop: 8,
            padding: 0,
            border: "none",
            background: "none",
            fontSize: 13,
            color: W.primary,
            cursor: "pointer",
          }}
        >
          {scheduleOpen
            ? t("productForm.cancelSchedule")
            : t("productForm.schedule")}
        </Button>
      </Field>

      {/* The 0fr -> 1fr grid row is what makes this animatable: it transitions
          to the real content height without anyone having to measure it. */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: scheduleOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 200ms ease",
        }}
      >
        {/* min-height:0 lets the grid row shrink to nothing; visibility keeps
            the collapsed inputs out of the tab order. */}
        <div
          style={{
            overflow: "hidden",
            minHeight: 0,
            visibility: scheduleOpen ? "visible" : "hidden",
            transition: "visibility 200ms",
          }}
        >
          <Field label={t("productForm.saleStartDate")}>
            <DateInput
              isEmpty={!saleStart}
              registration={register("saleStart")}
            />
          </Field>

          <Field label={t("productForm.saleEndDate")}>
            <DateInput
              isEmpty={!saleEnd}
              registration={register("saleEnd", {
                validate: (value) =>
                  isValidSaleRange(watch?.("saleStart"), value) ||
                  t("productForm.saleEndBeforeStart"),
              })}
            />
            {rangeInvalid && (
              <p className="text-red-400 text-sm mt-2">
                {t("productForm.saleEndBeforeStart")}
              </p>
            )}
            <p style={{ marginTop: 8, fontSize: 13, color: W.textSecondary }}>
              {t("productForm.scheduleHelp")}
            </p>
          </Field>
        </div>
      </div>

      <Field label={t("productForm.taxStatus")} help={t("productForm.taxStatusHelp")}>
        <select {...register("taxStatus")} style={wInput}>
          <option value="taxable">{t("productForm.taxable")}</option>
          <option value="shipping">{t("productForm.shippingOnly")}</option>
          <option value="none">{t("productForm.none")}</option>
        </select>
      </Field>
      <Field label={t("productForm.taxClass")} help={t("productForm.taxClassHelp")}>
        <select {...register("taxClass")} style={wInput}>
          <option value="standard">{t("productForm.standard")}</option>
          <option value="reduced_rate">{t("productForm.reducedRate")}</option>
          <option value="zero_rate">{t("productForm.zeroRate")}</option>
        </select>
      </Field>
    </>
  );
};

export default General;
