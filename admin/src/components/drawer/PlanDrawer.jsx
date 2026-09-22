import React from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";

// Internal import
import Title from "@/components/form/others/Title";
import PlanWizard from "@/components/plan/PlanWizard";
import usePlanSubmit from "@/hooks/usePlanSubmit";

const PlanDrawer = ({ id }) => {
  const { t } = useTranslation();
  const {
    planData,
    setPlanData,
    originalPlanData,
    handleSubmit,
    isSubmitting,
    strategy,
    setStrategy,
  } = usePlanSubmit(id);

  const isEditing = !!id;

  if (!planData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>{t("Loading")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditPlan") : t("AddPlan")}
          description={id ? t("UpdatePlanDescription") : t("AddPlanDescription")}
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <PlanWizard
            initialData={planData}
            onUpdate={setPlanData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            isEditing={isEditing}
            originalData={originalPlanData}
            strategy={strategy}
            onStrategyChange={setStrategy}
          />
        </div>
      </Scrollbars>
    </>
  );
};

export default PlanDrawer;
