import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardBody } from "@windmill/react-ui";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Internal imports
import PlanWizardStep1 from "./PlanWizardStep1";
import PlanWizardStep2 from "./PlanWizardStep2";
import PlanWizardStep3 from "./PlanWizardStep3";
import PlanWizardStep4 from "./PlanWizardStep4";
import PlanWizardStep5 from "./PlanWizardStep5";
import { useStoreContext } from "@/context/StoreContext";
import { Button } from "@sofia/ui";

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const PlanWizard = ({
  initialData = null,
  onSubmit,
  onUpdate,
  isSubmitting = false,
  isEditing = false,
  originalData = null,
  strategy = "new_subscribers_only",
  onStrategyChange = () => {},
}) => {
  const { t } = useTranslation();
  const { stores, currentStoreId } = useStoreContext() || {};
  const currentStore = stores?.find((s) => s._id === currentStoreId);
  const storeCurrency = currentStore?.currency || "USD";
  const [currentStep, setCurrentStep] = useState(1);
   const [planData, setPlanData] = useState({
     name: "",
     slug: "",
     description: "",
     badge: "",
     color: "#3B82F6",
     icon: "",
     pricing: {
       monthly: 0,
       yearly: 0,
       currency: storeCurrency,
       taxIncluded: false,
       trialDays: 0,
     },
     features: {},
     limits: {},
     status: "draft",
     visibility: "public",
     notes: "",
     versionNote: "",
   });
  const [errors, setErrors] = useState({});

  const totalSteps = 5;

  useEffect(() => {
     const baseDefaults = {
       name: "",
       slug: "",
       description: "",
       badge: "",
       color: "#3B82F6",
       icon: "",
       pricing: {
         monthly: 0,
         yearly: 0,
         currency: storeCurrency,
         taxIncluded: false,
         trialDays: 0,
       },
       features: {},
       limits: {},
       status: "draft",
       visibility: "public",
       notes: "",
       versionNote: "",
     };
     if (initialData) {
       setPlanData({
         ...baseDefaults,
         ...initialData,
         pricing: {
           ...baseDefaults.pricing,
           ...initialData.pricing,
         },
         features: initialData.features || {},
         limits: initialData.limits || {},
         notes: initialData.notes || "",
         versionNote: initialData.versionNote || "",
       });
     } else {
       setPlanData(baseDefaults);
     }
  }, [initialData, storeCurrency]);

  const updatePlanData = (newData) => {
    setPlanData((prev) => {
      const updatedPlan = {
        ...prev,
        ...newData,
      };
      onUpdate?.(updatedPlan);
      return updatedPlan;
    });
    setErrors({});
  };

  const pricingChanged =
    isEditing &&
    originalData &&
    (planData.pricing?.monthly !== originalData.pricing?.monthly ||
      planData.pricing?.yearly !== originalData.pricing?.yearly);

  const reducedQuotas =
    isEditing &&
    originalData &&
    Object.keys(planData.limits || {}).filter((key) => {
      const oldVal = originalData.limits?.[key];
      const newVal = planData.limits?.[key];
      return (
        oldVal !== null &&
        oldVal !== undefined &&
        newVal !== null &&
        newVal !== undefined &&
        Number(newVal) < Number(oldVal)
      );
    });

  const validateCurrentStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      const currentSlug = planData.slug?.trim() || slugify(planData.name || "");

      if (!planData.name?.trim()) {
        newErrors.name = t("PlanNameRequired") || "Plan name is required";
      }

      if (!currentSlug) {
        newErrors.slug = t("PlanSlugRequired") || "Plan slug is required";
      }

      // Auto-fix the slug in state if it's empty but we have a name
      if (currentSlug && !planData.slug?.trim()) {
        updatePlanData({ slug: currentSlug });
      }
    }

    switch (currentStep) {
      case 1:
        break;
      case 2:
        if (
          planData.pricing?.monthly === undefined ||
          planData.pricing?.monthly === ""
        ) {
          newErrors.monthly =
            t("MonthlyPriceRequired") || "Monthly price is required";
        }
        if (
          planData.pricing?.yearly === undefined ||
          planData.pricing?.yearly === ""
        ) {
          newErrors.yearly =
            t("YearlyPriceRequired") || "Yearly price is required";
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prevStep) => Math.min(prevStep + 1, totalSteps));
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep((prevStep) => Math.max(prevStep - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    if (!onSubmit) {
      setErrors({ submit: t("PlanSubmitError") || "Unable to save plan" });
      return;
    }

    const submitData = {
      ...planData,
      slug: planData.slug?.trim() || slugify(planData.name || ""),
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      setErrors({ submit: error?.message || t("PlanSubmitError") });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PlanWizardStep1
            data={planData}
            errors={errors}
            onUpdate={updatePlanData}
            isEditing={isEditing}
          />
        );
      case 2:
        return (
          <PlanWizardStep2
            data={planData}
            errors={errors}
            onUpdate={updatePlanData}
            isEditing={isEditing}
            originalData={originalData}
            strategy={strategy}
            onStrategyChange={onStrategyChange}
          />
        );
      case 3:
        return (
          <PlanWizardStep3
            data={planData}
            errors={errors}
            onUpdate={updatePlanData}
          />
        );
      case 4:
        return (
          <PlanWizardStep4
            data={planData}
            errors={errors}
            onUpdate={updatePlanData}
            isEditing={isEditing}
            originalData={originalData}
          />
        );
      case 5:
        return (
          <PlanWizardStep5
            data={planData}
            errors={errors}
            onUpdate={updatePlanData}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = [
      t("GeneralInformation") || "General Information",
      t("Pricing") || "Pricing",
      t("Features") || "Features",
      t("Quotas") || "Quotas",
      t("Publication") || "Publication",
    ];
    return titles[currentStep - 1] || "";
  };

  const getStepDescription = () => {
    const descriptions = [
      t("EnterPlanBasicInfo") || "Enter basic plan information",
      t("SetPlanPricing") || "Set monthly and yearly pricing",
      t("SelectPlanFeatures") || "Select plan features",
      t("ConfigurePlanQuotas") || "Configure usage quotas",
      t("SetPlanStatus") || "Set plan status and publish",
    ];
    return descriptions[currentStep - 1] || "";
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardBody className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getStepTitle()}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getStepDescription()}
              </p>
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentStep} / {totalSteps}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </CardBody>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardBody className="py-8">{renderStep()}</CardBody>
      </Card>

      <div className="flex justify-between gap-4">
        <Button
          disabled={currentStep === 1}
          onClick={handlePreviousStep}
          layout="outline"
          className="flex items-center gap-2 px-5 h-10 justify-center"
        >
          <FiChevronLeft />
          {t("Previous") || "Previous"}
        </Button>

        {currentStep < totalSteps ? (
          <Button
            onClick={handleNextStep}
            className="flex items-center gap-2 px-5 h-10 justify-center"
          >
            {t("Next") || "Next"}
            <FiChevronRight />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 h-10 justify-center bg-emerald-600 hover:bg-emerald-700"
          >
          {isSubmitting
            ? t("Submitting") || "Submitting..."
            : planData?._id
            ? isEditing
              ? t("SaveChanges") || "Save changes"
              : t("UpdatePlan") || "Update Plan"
            : t("CreatePlan") || "Create Plan"}
          </Button>
        )}
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {errors.submit}
        </div>
      )}
    </div>
  );
};

export default PlanWizard;
