import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

// Internal import
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import Error from "@/components/form/others/Error";
import QuotaTypeServices from "@/services/QuotaTypeServices";

const PlanWizardStep4 = ({
  data,
  errors,
  onUpdate,
  isEditing = false,
  originalData = null,
}) => {
  const { t } = useTranslation();

  const { data: quotaTypeResponse } = useQuery({
    queryKey: ["quota-types", "plan-wizard-step4"],
    queryFn: () => QuotaTypeServices.getAllQuotaTypes({ limit: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const quotaTypes = quotaTypeResponse?.data?.data || [];

  const limitOptions =
    quotaTypes.map((quotaType) => ({
      key: quotaType.code,
      label: quotaType.name || quotaType.code,
      unit: quotaType.unit,
    })) || [
      { key: "stores", label: t("LimitStores") || "Stores" },
      { key: "staff", label: t("LimitStaff") || "Staff accounts" },
      { key: "products", label: t("LimitProducts") || "Products" },
      { key: "orders", label: t("LimitOrders") || "Orders per month" },
      { key: "supportTickets", label: t("LimitSupportTickets") || "Support tickets" },
    ];

  const reducedQuotas =
    isEditing &&
    originalData &&
    limitOptions.filter((limit) => {
      const oldVal = originalData.limits?.[limit.key];
      const newVal = data.limits?.[limit.key];
      return (
        oldVal !== null &&
        oldVal !== undefined &&
        newVal !== null &&
        newVal !== undefined &&
        Number(newVal) < Number(oldVal)
      );
    });

  const handleLimitChange = (key, value) => {
    onUpdate({
      limits: {
        ...data.limits,
        [key]: value === "" ? null : Number(value),
      },
    });
  };

  return (
    <div className="space-y-6">
      {isEditing && reducedQuotas.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm font-medium text-red-800">
            {t("QuotaReductionWarning") ||
              "Warning: The following quotas have been reduced:"}
          </p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {reducedQuotas.map((limit) => (
              <li key={limit.key}>
                {limit.label}: {originalData.limits?.[limit.key]} {" "}
                {data.limits?.[limit.key]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanQuotas")} />
        <div className="col-span-8 sm:col-span-4 space-y-4">
          {limitOptions.map((limit) => (
            <div key={limit.key} className="space-y-2">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {limit.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {limit.unit
                      ? `${t(`${limit.key}Help`) || "Set a numeric quota, leave empty for unlimited."} (${limit.unit})`
                      : t(`${limit.key}Help`) || "Set a numeric quota, leave empty for unlimited."}
                  </p>
                </div>
                <div className="w-32">
                  <InputArea
                    register={() => {}}
                    name={limit.key}
                    type="number"
                    placeholder={t("Unlimited") || "Unlimited"}
                    value={data.limits?.[limit.key] ?? ""}
                    onChange={(e) => handleLimitChange(limit.key, e.target.value)}
                    min="0"
                  />
                </div>
              </div>
              <Error errorName={errors[limit.key]} />
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200">
        {t("PlanQuotaHint") ||
          "Leave quota blank to allow unlimited access for this feature."}
      </div>
    </div>
  );
};

export default PlanWizardStep4;
