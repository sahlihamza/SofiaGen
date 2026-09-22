import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

// Internal import
import LabelArea from "@/components/form/selectOption/LabelArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import FeatureServices from "@/services/FeatureServices";

const PlanWizardStep3 = ({ data, errors, onUpdate }) => {
  const { t } = useTranslation();

  const { data: featuresResponse, isLoading: featuresLoading } = useQuery({
    queryKey: ["features", "plan-wizard-step3"],
    queryFn: () => FeatureServices.getAllFeatures(),
    staleTime: 1000 * 60 * 5,
  });

  // Use dynamic features from API, fallback to empty array
  const featureOptions = featuresResponse?.data || [];

  // Filter only active features
  const activeFeatures = featureOptions.filter((feature) => feature.status === "active");

  const handleToggle = (featureCode) => {
    onUpdate({
      features: {
        ...data.features,
        [featureCode]: !Boolean(data.features?.[featureCode]),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <LabelArea label={t("PlanFeatures")} />
        <div className="col-span-8 sm:col-span-4 space-y-4">
          {featuresLoading ? (
            <p className="text-sm text-gray-500">{t("Loading") || "Loading features..."}</p>
          ) : activeFeatures.length > 0 ? (
            activeFeatures.map((feature) => (
              <div
                key={feature.code}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {feature.name}
                  </p>
                  {feature.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  )}
                </div>
                <SwitchToggle
                  processOption={Boolean(data.features?.[feature.code])}
                  handleProcess={() => handleToggle(feature.code)}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">{t("NoFeaturesFound") || "No features available."}</p>
          )}
          {errors.features && (
            <p className="text-sm text-red-500">{errors.features}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanWizardStep3;
