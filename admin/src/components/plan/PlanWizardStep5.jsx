import React from "react";
import { useTranslation } from "react-i18next";

// Internal import
import LabelArea from "@/components/form/selectOption/LabelArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import InputArea from "@/components/form/input/InputArea";

const PlanWizardStep5 = ({ data, errors, onUpdate }) => {
  const { t } = useTranslation();

  const handleStatusChange = (value) => {
    onUpdate({ status: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanStatus")} />
        <div className="col-span-8 sm:col-span-4">
          <select
            value={data.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="draft">{t("Draft") || "Draft"}</option>
            <option value="active">{t("Active") || "Active"}</option>
            <option value="inactive">{t("Inactive") || "Inactive"}</option>
            <option value="archived">{t("Archived") || "Archived"}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanNotes")} />
        <div className="col-span-8 sm:col-span-4">
          <InputArea
            register={() => {}}
            name="notes"
            type="text"
            placeholder={t("PlanNotesPlaceholder") || "Internal notes for your team"}
            value={data.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("PlanNotesHelp") || "Optional note about this plan."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanWizardStep5;
