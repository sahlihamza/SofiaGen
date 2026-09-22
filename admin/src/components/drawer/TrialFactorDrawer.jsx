import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";
import { SecondaryButton, PrimaryButton, Button } from "@sofia/ui";

import Title from "@/components/form/others/Title";
import TrialFactorServices from "@/services/TrialFactorServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const CATEGORIES = [
  { code: "time", label: "Temps" },
  { code: "catalog", label: "Catalogue" },
  { code: "business", label: "Business" },
  { code: "api", label: "API" },
  { code: "storage", label: "Stockage" },
  { code: "marketing", label: "Marketing" },
  { code: "ai", label: "AI" },
];

const UNITS = ["number", "gb", "mb", "days", "hours", "currency", "percent"];
const OPERATORS = [
  "equals",
  "notEquals",
  "greaterThan",
  "lessThan",
  "greaterThanOrEqual",
  "lessThanOrEqual",
  "between",
  "in",
  "notIn",
];
const STATUSES = ["active", "inactive", "archived"];

const TrialFactorDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "time",
    unit: "number",
    description: "",
    icon: "",
    operators: ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"],
    isTimeFactor: false,
    status: "active",
  });

  useEffect(() => {
    if (id) {
      TrialFactorServices.getTrialFactorById(id).then((res) => {
        const f = res.data;
        setFormData({
          code: f.code || "",
          name: f.name || "",
          category: f.category || "time",
          unit: f.unit || "number",
          description: f.description || "",
          icon: f.icon || "",
          operators: f.operators || ["greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"],
          isTimeFactor: f.isTimeFactor ?? f.category === "time",
          status: f.status || "active",
        });
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOperatorToggle = (op) => {
    setFormData((prev) => ({
      ...prev,
      operators: prev.operators.includes(op)
        ? prev.operators.filter((o) => o !== op)
        : [...prev.operators, op],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = { ...formData };
      if (payload.category === "time") payload.isTimeFactor = true;
      if (id) {
        await TrialFactorServices.updateTrialFactor(id, payload);
        successMessage("Trial factor updated successfully");
      } else {
        await TrialFactorServices.createTrialFactor(payload);
        successMessage("Trial factor created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["trial-factors"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save trial factor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditTrialFactor") || "Edit Trial Factor" : t("AddTrialFactor") || "Add Trial Factor"}
          description={
            id
              ? t("UpdateTrialFactorDescription") || "Update trial factor information"
              : t("AddTrialFactorDescription") || "Add a new trial factor used by the rule builder"
          }
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit} className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <div className="space-y-6">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Code")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. orders"
                  disabled={Boolean(id)}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Name")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Category")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className={inputCls}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Unit")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  className={inputCls}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Description")}</label>
              <div className="col-span-8 sm:col-span-4">
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className={inputCls}
                  rows={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Icon")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => handleChange("icon", e.target.value)}
                  className={inputCls}
                  placeholder="e.g. FiShoppingCart"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("TimeFactor") || "Time Factor"}</label>
              <div className="col-span-8 sm:col-span-4 flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isTimeFactor}
                  onChange={(e) => handleChange("isTimeFactor", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Operators")}</label>
              <div className="col-span-8 sm:col-span-4 flex flex-wrap gap-2">
                {OPERATORS.map((op) => (
                  <Button
                    key={op}
                    type="button"
                    variant={formData.operators.includes(op) ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handleOperatorToggle(op)}
                    className="px-2 py-1 text-xs rounded border"
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Status")}</label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className={inputCls}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <SecondaryButton
              type="button"
              onClick={toggleDrawer}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
            >
              {t("Cancel") || "Cancel"}
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {id ? t("Update") || "Update" : t("Add") || "Add"}
            </PrimaryButton>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default TrialFactorDrawer;
