import React, { useContext, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiArrowRight, FiArrowLeft, FiEdit2, FiPlus, FiGlobe, FiSettings, FiGrid, FiCreditCard, FiDollarSign } from "react-icons/fi";
import Scrollbars from "react-custom-scrollbars-2";
import { useQuery } from "@tanstack/react-query";
import { SidebarContext } from "@/context/SidebarContext";
import { AdminContext } from "@/context/AdminContext";
import useStoreSubmit from "@/hooks/useStoreSubmit";
import StoreServices from "@/services/StoreServices";
import PlanServices from "@/services/PlanServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import platformAPI from "@/services/api/platformAPI";
import StoreIdentityStep from "./steps/StoreIdentityStep";
import DomainLocalizationStep from "./steps/DomainLocalizationStep";
import OwnerDetailsStep from "./steps/OwnerDetailsStep";
import ThemeStep from "./steps/ThemeStep";
import PlanSelectionStep from "./steps/PlanSelectionStep";
import PaymentStep from "./steps/PaymentStep";
import ConfirmationStep from "./steps/ConfirmationStep";
import { Button } from "@sofia/ui";

const STEP_ICONS = [FiPlus, FiGlobe, FiSettings, FiGrid, FiCreditCard, FiDollarSign, FiCheck];

const StoreStepper = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { state } = useContext(AdminContext);
  const { adminInfo } = state || {};
  const isSuperAdmin = Boolean(adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin");
  const isCreateMode = !id;
  const showOwnerStep = isSuperAdmin || !isCreateMode;
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    subdomain: "",
    customDomain: "",
    category: "",
    country: "",
    language: "",
    currency: "TND",
    timezone: "",
    plan: "",
    planId: "",
    planName: "",
    planSlug: "",
    billingCycle: "monthly",
    status: true,
    address: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    ownerAddress: "",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPassword: "",
    ownerLanguage: "en",
    theme: "none",
    paymentGateway: "manual",
    couponCode: "",
    discount: null,
    skipPayment: false,
  });
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [nameAvailable, setNameAvailable] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);

  const {
    register,
    onSubmit: hookOnSubmit,
    errors,
    imageUrl,
    setImageUrl,
    isSubmitting,
    setIsSubmitting,
    isNameValid,
    watch,
    setValue,
    setError,
  } = useStoreSubmit(id);

  const { data: plansResponse, isLoading: isPlansLoading } = useQuery({
    queryKey: ["active-plans"],
    queryFn: () => PlanServices.getActivePlans(),
  });

  const availablePlans = plansResponse?.data || [];

  useEffect(() => {
    if (!availablePlans.length) return;

    const defaultPlan =
      availablePlans.find((plan) => plan.isDefault) || availablePlans[0];

    if (!defaultPlan) return;

    setFormData((prev) => {
      if (prev.plan) {
        return prev;
      }

      return {
        ...prev,
        plan: defaultPlan.slug || defaultPlan.name || "",
        planId: defaultPlan._id || "",
        planName: defaultPlan.name || "",
        planSlug: defaultPlan.slug || "",
      };
    });
  }, [availablePlans]);

  useEffect(() => {
    if (!id) return;

    const loadStore = async () => {
      try {
        setIsStoreLoading(true);
        const store = await StoreServices.getStoreById(id);
        if (store) {
          setFormData((prev) => ({
            ...prev,
            name: store.name || prev.name,
            address: store.address || prev.address,
            currency: store.currency || prev.currency,
            status: store.isActive ?? prev.status,
            country: store.country || prev.country,
            language: store.language || prev.language,
            timezone: store.timezone || prev.timezone,
            plan: store.planSlug || store.plan || prev.plan,
            planId: store.planId || prev.planId,
            planName: store.planName || prev.planName,
            planSlug: store.planSlug || prev.planSlug,
            subdomain: store.subdomain || prev.subdomain,
            customDomain: store.customDomain || prev.customDomain,
            slug: store.slug || prev.slug,
          }));
        }
      } catch (error) {
        console.error("Failed to load store data:", error);
      } finally {
        setIsStoreLoading(false);
      }
    };

    loadStore();
  }, [id]);

  useEffect(() => {
    const name = formData.name?.trim();
    if (!name || name.length < 2) {
      setNameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingName(true);
      try {
        const res = await StoreServices.checkStoreName(name);
        setNameAvailable(Boolean(res?.available ?? res?.data?.available));
      } catch {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name]);

  useEffect(() => {
    const subdomain = formData.subdomain?.trim();
    if (!subdomain) {
      setSubdomainAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const res = await StoreServices.checkStoreSubdomain(subdomain);
        setSubdomainAvailable(Boolean(res?.available ?? res?.data?.available));
      } catch {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.subdomain]);

  useEffect(() => {
    if (isCreateMode && !isSuperAdmin && adminInfo) {
      const ownerFirstName = adminInfo.firstName || "";
      const ownerLastName = adminInfo.lastName || "";
      const ownerName = `${ownerFirstName} ${ownerLastName}`.trim() || adminInfo.name || adminInfo.email || "";

      setFormData((prev) => ({
        ...prev,
        ownerEmail: adminInfo.email || "",
        ownerName,
        ownerFirstName,
        ownerLastName,
        ownerPhone: adminInfo.phone || "",
        ownerAddress: adminInfo.address || "",
      }));

      setValue("ownerEmail", adminInfo.email || "");
      setValue("ownerName", ownerName);
      setValue("ownerFirstName", ownerFirstName);
      setValue("ownerLastName", ownerLastName);
      setValue("ownerPhone", adminInfo.phone || "");
      setValue("ownerAddress", adminInfo.address || "");
    }
  }, [isCreateMode, isSuperAdmin, adminInfo, setValue]);

  const steps = [
    {
      key: "identity",
      label: t("StoreIdentityStep") || "Store Identity",
      shortLabel: "Identity",
      description:
        t("StoreIdentityStepDesc") || "Set up your store name, slug and logo.",
    },
    {
      key: "domain",
      label: t("DomainStep") || "Domain & Localization",
      shortLabel: "Domain",
      description:
        t("DomainStepDesc") || "Configure domain and regional settings.",
    },
    ...(showOwnerStep
      ? [
          {
            key: "owner",
            label: t("OwnerDetailsStep") || "Owner Details",
            shortLabel: "Owner",
            description:
              t("OwnerDetailsStepDesc") ||
              "Provide contact and owner information to complete the setup.",
          },
        ]
      : []),
    {
      key: "theme",
      label: t("ThemeStep") || "Theme",
      shortLabel: "Theme",
      description:
        t("ThemeStepDesc") || "Choose a storefront theme for your store.",
    },
    {
      key: "plan",
      label: t("PlanSelectionStep") || "Plan & Billing",
      shortLabel: "Plan",
      description:
        t("PlanSelectionStepDesc") ||
        "Select a plan and configure billing settings.",
    },
    {
      key: "payment",
      label: t("PaymentStep") || "Payment",
      shortLabel: "Payment",
      description:
        t("PaymentStepDesc") || "Complete payment to activate your subscription.",
    },
    {
      key: "confirm",
      label: t("ConfirmationStep") || "Confirmation",
      shortLabel: "Confirm",
      description:
        t("ConfirmationStepDesc") ||
        "Review and finalize your store settings before creating it.",
    },
  ];

  const progressPercent = ((activeStep) / (steps.length - 1)) * 100;

  const handleNextStep = () => {
    if (activeStep < steps.length - 1) {
      setDirection(1);
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setDirection(-1);
      setActiveStep(activeStep - 1);
    }
  };

  const handleGoToStep = (index) => {
    if (index > 0 && index <= activeStep) {
      setDirection(index > activeStep ? 1 : -1);
      setActiveStep(index);
    }
  };

  const handleFormDataChange = useCallback((newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  }, []);

  const handleSubmitStep = async (e) => {
    e.preventDefault();

    if (activeStep === 0) {
      const name = formData.name?.trim();
      if (!name || name.length < 2) {
        notifyError(t("StoreNameRequired") || "Store name must be at least 2 characters");
        return;
      }

      setCheckingName(true);
      try {
        const res = await StoreServices.checkStoreName(name);
        const available = res?.data?.available ?? res?.available ?? true;

        if (!available) {
          setNameAvailable(false);
          setError("name", {
            type: "manual",
            message:
              res?.data?.message ||
              res?.message ||
              t("StoreNameTaken") ||
              "This store name is already taken",
          });
          notifyError(
            res?.data?.message ||
              res?.message ||
              t("StoreNameTaken") ||
              "This store name is already taken"
          );
          return;
        }

        setNameAvailable(true);
      } catch (err) {
        console.warn("Store name check failed:", err);
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }

    if (activeStep === 1) {
      const subdomain = formData.subdomain?.trim();

      if (!subdomain) {
        setError("subdomain", {
          type: "manual",
          message:
            t("SubdomainRequired") ||
            "Please provide a subdomain.",
        });
        notifyError(
          t("SubdomainRequired") ||
            "Please provide a subdomain."
        );
        return;
      }

      if (subdomain) {
        setCheckingSubdomain(true);
        try {
          const res = await StoreServices.checkStoreSubdomain(subdomain);
          const available = res?.data?.available ?? res?.available ?? true;

          if (!available) {
            setSubdomainAvailable(false);
            setError("subdomain", {
              type: "manual",
              message:
                res?.data?.message ||
                res?.message ||
                t("SubdomainTaken") ||
                "This subdomain is already taken",
            });
            notifyError(
              res?.data?.message ||
                res?.message ||
                t("SubdomainTaken") ||
                "This subdomain is already taken"
            );
            return;
          }

          setSubdomainAvailable(true);
        } catch (err) {
          console.warn("Subdomain check failed:", err);
          setSubdomainAvailable(null);
        } finally {
          setCheckingSubdomain(false);
        }
      }
    }

    if (activeStep === 4) {
      if (!formData.planId) {
        notifyError(t("PlanRequired") || "Please select a plan");
        return;
      }
    }

    if (activeStep === steps.length - 1) {
      if (steps[activeStep]?.key === "payment") {
        return;
      }

      const watchedName = watch ? watch("name", formData.name) : formData.name;

      const submitData = {
        name: watchedName || formData.name,
        address: formData.address || formData.ownerAddress,
        currency: formData.currency,
        country: formData.country,
        language: formData.language,
        timezone: formData.timezone,
        category: formData.category,
        subdomain: formData.subdomain,
        customDomain: formData.customDomain,
        plan: formData.plan,
        isActive: formData.status,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        ownerAddress: formData.ownerAddress,
        ownerFirstName: formData.ownerFirstName,
        ownerLastName: formData.ownerLastName,
        ownerPassword: formData.ownerPassword,
        ownerLanguage: formData.ownerLanguage,
        planId: formData.planId,
        planName: formData.planName,
        planSlug: formData.planSlug,
        theme: formData.theme,
        themeId: formData.theme,
        logo: imageUrl,
        billingCycle: formData.billingCycle || "monthly",
        paymentGateway: formData.paymentGateway || "manual",
        couponCode: formData.couponCode,
      };

      let hasError = false;
      let result;
      try {
        setIsSubmitting(true);
        result = await hookOnSubmit(submitData);
        const createdStoreId = result?._id || result?.data?._id;
        if (createdStoreId) {
          setFormData((prev) => ({ ...prev, tempStoreId: createdStoreId }));
        }
      } catch (err) {
        hasError = true;
        const message =
          err?.response?.data?.message ||
          err?.data?.message ||
          err?.message ||
          "Something went wrong!";

        if (message.toLowerCase().includes("already exists")) {
          setError("name", { type: "manual", message });
        }

        notifyError(message);
      } finally {
        setIsSubmitting(false);
      }

      if (!hasError) {
        const ownerDisplay =
          formData.ownerFirstName || formData.ownerLastName
            ? `${formData.ownerFirstName || ""} ${formData.ownerLastName || ""}`.trim()
            : formData.ownerName || formData.ownerEmail || "";

        let roleDisplay = "";
        const createdStoreId = result?._id || result?.data?._id;
        const ownerId = result?.ownerId || result?.data?.ownerId;

        if (ownerId && createdStoreId) {
          try {
            const [ownerRes, storeRolesRes] = await Promise.all([
              platformAPI.getUserById(ownerId),
              platformAPI.getUserStoreRoles(ownerId, createdStoreId),
            ]);

            const globalRoles = (ownerRes?.data?.role || [])
              .map((r) => r?.name)
              .filter(Boolean);

            const storeRoleNames = (storeRolesRes?.data || [])
              .map((r) => r?.roleName)
              .filter(Boolean);

            const allRoles = [...new Set([...globalRoles, ...storeRoleNames])];
            if (allRoles.length > 0) {
              roleDisplay = ` | Roles: ${allRoles.join(", ")}`;
            }
          } catch (err) {
            console.warn("StoreStepper: failed to load owner roles after store creation", err);
            roleDisplay = " | Roles: (unavailable)";
          }
        }

        const message = `${t("StoreCreatedSuccessfully") || "Store created successfully!"}${ownerDisplay ? ` Owner: ${ownerDisplay}` : ""}${roleDisplay}`;

        notifySuccess(message);
        toggleDrawer();
      }
    } else {
      handleNextStep();
    }
  };

  const isStepValid = () => {
    const currentStep = steps[activeStep]?.key;

    switch (currentStep) {
      case "identity":
        return isNameValid;
      case "domain": {
        const hasDomainInfo = Boolean(watch("subdomain")?.trim());
        return !!(
          watch("country") &&
          watch("language") &&
          watch("currency") &&
          watch("timezone") &&
          hasDomainInfo
        );
      }
      case "owner":
        return !!(
          watch("ownerFirstName") &&
          watch("ownerLastName") &&
          watch("ownerEmail") &&
          watch("ownerPhone")
        );
      case "plan":
        return Boolean(formData.planId);
      default:
        return true;
    }
  };

  const isNextDisabled =
    (activeStep < steps.length - 1 && !isStepValid()) ||
    (activeStep === steps.length - 1 && isSubmitting) ||
    (activeStep === 1 && checkingSubdomain);
  const isLastStep = activeStep === steps.length - 1;
  const isFirstStep = activeStep === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg shadow-sm ${
              id
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}
          >
            {id ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {steps[activeStep]?.label || (id ? t("StoreDrawerUpdateTitle") : t("StoreDrawerAddTitle"))}
            </h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {steps[activeStep]?.description || (id ? t("StoreDrawerUpdateDesc") : t("StoreDrawerAddDesc"))}
            </p>
          </div>
        </div>
      </div>

      {/* â”€â”€ Stepper Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="px-5 pt-4 pb-1.5">
          <div className="relative max-w-xl mx-auto">
            {/* Background track */}
            <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-100 dark:bg-gray-700 rounded-full" />
            {/* Animated fill */}
            <div
              className="absolute top-5 left-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Step circles */}
            <div className="relative flex justify-between">
              {steps.map((step, index) => {
                const StepIcon = STEP_ICONS[index];
                const isCompleted = index > 0 && index < activeStep;
                const isCurrent = index === activeStep;
                const isClickable = index > 0 && index <= activeStep;

                return (
                  <Button
                    key={step.key}
                    type="button"
                    onClick={() => handleGoToStep(index)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center focus:outline-none ${
                      isClickable ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`${t("Step") || "Step"} ${index + 1}: ${step.label}`}
                  >
                    {/* Circle */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/40"
                          : isCurrent
                          ? "bg-white dark:bg-gray-800 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-200/60 dark:shadow-emerald-900/40 scale-110"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                      } ${isClickable && !isCurrent ? "group-hover:scale-105" : ""}`}
                    >
                      {isCompleted ? (
                        <FiCheck size={18} strokeWidth={3} />
                      ) : (
                        <StepIcon
                          size={18}
                          className={isCurrent ? "animate-none" : ""}
                        />
                      )}
                      {/* Pulse ring on current step */}
                      {isCurrent && (
                        <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="mt-2 text-center">
                      <p
                        className={`text-xs font-semibold transition-colors ${
                          isCurrent
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isCompleted
                            ? "text-gray-800 dark:text-gray-200"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {step.shortLabel}
                      </p>
                      <p
                        className={`text-[10px] mt-0.5 hidden sm:block transition-colors ${
                          isCurrent
                            ? "text-emerald-500/80 dark:text-emerald-400/70"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {t("Step") || "Step"} {index + 1}/{steps.length}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Current step description banner */}
           
        </div>
      </div>

      {/* â”€â”€ Step Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 overflow-hidden">
        <Scrollbars className="w-full h-full dark:bg-gray-900 dark:text-gray-200">
          <form onSubmit={handleSubmitStep}>
            <div
              key={activeStep}
              className="p-6 pb-24"
              style={{
                animation: `storeStepFadeSlide 260ms ease-out`,
              }}
            >
              {isStoreLoading && id ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-3" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t("Loading") || "Loading..."}
                  </span>
                </div>
              ) : (
                <>
                  {steps[activeStep]?.key === "identity" && (
                    <StoreIdentityStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      register={register}
                      errors={errors}
                      imageUrl={imageUrl}
                      setImageUrl={setImageUrl}
                      plans={availablePlans}
                      isPlansLoading={isPlansLoading}
                      nameAvailable={nameAvailable}
                      checkingName={checkingName}
                    />
                  )}

                  {steps[activeStep]?.key === "domain" && (
                    <DomainLocalizationStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      register={register}
                      errors={errors}
                      subdomainAvailable={subdomainAvailable}
                      checkingSubdomain={checkingSubdomain}
                    />
                  )}

                  {steps[activeStep]?.key === "owner" && (
                    <OwnerDetailsStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      register={register}
                      errors={errors}
                      setValue={setValue}
                    />
                  )}

                  {steps[activeStep]?.key === "theme" && (
                    <ThemeStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      register={register}
                      errors={errors}
                    />
                  )}

                  {steps[activeStep]?.key === "plan" && (
                    <PlanSelectionStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      plans={availablePlans}
                      isPlansLoading={isPlansLoading}
                    />
                  )}

                  {steps[activeStep]?.key === "payment" && (
                    <PaymentStep
                      formData={formData}
                      onDataChange={handleFormDataChange}
                      storeId={formData.tempStoreId}
                      planId={formData.planId}
                      plans={availablePlans}
                      onPaymentComplete={(data) => {
                        setFormData((prev) => ({ ...prev, paymentCompleted: true, paymentData: data }));
                        notifySuccess(t("PaymentSuccessful") || "Payment completed successfully!");
                        setTimeout(() => {
                          toggleDrawer();
                        }, 1500);
                      }}
                      onPaymentError={(err) => {
                        notifyError(err);
                      }}
                      onSkipPayment={() => {
                        setFormData((prev) => ({ ...prev, skipPayment: true }));
                      }}
                    />
                  )}

                  {steps[activeStep]?.key === "confirm" && (
                    <ConfirmationStep
                      formData={formData}
                      imageUrl={imageUrl}
                      isActive={formData.status}
                    />
                  )}
                </>
              )}
            </div>

            {/* â”€â”€ Footer Buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="fixed bottom-0 z-40 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-3 max-w-xl mx-auto">
                {/* Back / Cancel */}
                <Button
                  type="button"
                  onClick={isFirstStep ? toggleDrawer : handlePrevStep}
                  className="inline-flex items-center justify-center gap-2 min-w-[130px] px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  {isFirstStep ? (
                    t("StoreCancelBtn")
                  ) : (
                    <>
                      <FiArrowLeft size={16} />
                      {t("BackBtn") || t("Previous")}
                    </>
                  )}
                </Button>

                {/* Step dots (mobile indicator) */}
                <div className="hidden xs:flex items-center gap-1.5 sm:hidden">
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === activeStep
                          ? "w-5 bg-emerald-500"
                          : i < activeStep
                          ? "w-1.5 bg-emerald-400"
                          : "w-1.5 bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>

                {/* Next / Submit */}
                <Button
                  type="submit"
                  disabled={isNextDisabled}
                  className={`inline-flex items-center justify-center gap-2 min-w-[190px] px-5 py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    isNextDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                      : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-200/60 dark:shadow-emerald-900/40 hover:shadow-lg"
                  }`}
                >
                  {isSubmitting && isLastStep ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t("StoreSavingBtn")}
                    </>
                  ) : steps[activeStep]?.key === "confirm" ? (
                    <>
                      {t("CompleteSetupBtn") || "Complete Setup"}
                      <FiCheck size={16} strokeWidth={3} />
                    </>
                  ) : steps[activeStep]?.key === "payment" ? (
                    <>
                      {formData.skipPayment ? (
                        <FiCheck size={16} />
                      ) : (
                        <FiCreditCard size={16} />
                      )}
                      {formData.skipPayment
                        ? t("CreateStoreWithoutPayment") || "Create Store (Pay Later)"
                        : t("PayNow") || "Pay Now"}
                    </>
                  ) : isLastStep ? (
                    <>
                      <FiCheck size={16} strokeWidth={3} />
                      {t("CreateStoreAndSendInvitation") ||
                        "Create Store & Send Invitation"}
                    </>
                  ) : (
                    <>
                      {t("NextBtn")}
                      <FiArrowRight size={16} />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Scrollbars>
      </div>

      {/* Step transition keyframes */}
      <style>{`
        @keyframes storeStepFadeSlide {
          from {
            opacity: 0;
            transform: translateX(${direction > 0 ? "14px" : "-14px"});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StoreStepper;