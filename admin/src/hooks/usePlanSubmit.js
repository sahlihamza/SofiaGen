import { useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { SidebarContext } from "@/context/SidebarContext";
import { useCurrency } from "@/hooks/useCurrency";
import PlanServices from "@/services/PlanServices";
import useNotification from "@/hooks/useNotification";
import { buildPlanPayload } from "@/utils/planPayload";

const normalizeMap = (value) => {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === "object") return value;
  return {};
};

const defaultPlanValues = {
  name: "",
  slug: "",
  description: "",
  badge: "",
  color: "#3B82F6",
  icon: "",
  pricing: {
    monthly: 0,
    yearly: 0,
    currency: "USD",
    taxIncluded: false,
    trialDays: 0,
  },
  features: {},
  limits: {},
  status: "draft",
  notes: "",
};

const usePlanSubmit = (planId) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();

  const { currency: storeCurrency } = useCurrency();

  const [planData, setPlanData] = useState(null);
  const [originalPlanData, setOriginalPlanData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [strategy, setStrategy] = useState("new_subscribers_only");

  const getDefaults = () => ({
    ...defaultPlanValues,
    pricing: {
      ...defaultPlanValues.pricing,
      currency: storeCurrency,
    },
  });

  useEffect(() => {
    if (!planId) {
      setPlanData(getDefaults());
      setOriginalPlanData(getDefaults());
      return;
    }

    const loadPlan = async () => {
      try {
        const response = await PlanServices.getPlanById(planId);
        // API responses are wrapped as { success: true, data: <plan> }
        const plan = response?.data?.data || response?.data || null;
        const loadedPlan = {
          ...defaultPlanValues,
          ...plan,
          pricing: {
            ...defaultPlanValues.pricing,
            ...(plan?.pricing || {}),
          },
          features: normalizeMap(plan?.features),
          limits: normalizeMap(plan?.limits),
          notes: plan?.notes || "",
        };
        setPlanData(loadedPlan);
        setOriginalPlanData(loadedPlan);
      } catch (err) {
        errorMessage(err?.response?.data?.message || "Failed to load plan");
      }
    };

    loadPlan();
  }, [planId, errorMessage]);

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const payload = buildPlanPayload(data, strategy);

      if (planId) {
        try {
          await PlanServices.updatePlan(planId, payload);
          successMessage("Plan updated successfully");
        } catch (err) {
          if (err?.response?.status === 409) {
            errorMessage(
              t("VersionConflict") ||
                "Version conflict: plan was modified by another user. Please reload."
            );
            return;
          }
          throw err;
        }
      } else {
        await PlanServices.createPlan(payload);
        successMessage("Plan created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save the plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    planData,
    setPlanData,
    originalPlanData,
    handleSubmit,
    isSubmitting,
    strategy,
    setStrategy,
  };
};

export default usePlanSubmit;
