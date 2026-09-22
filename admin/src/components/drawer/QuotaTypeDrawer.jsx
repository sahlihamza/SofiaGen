import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";
import { SecondaryButton, PrimaryButton } from "@sofia/ui";

// Internal import
import Title from "@/components/form/others/Title";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const QuotaTypeDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    unit: "number",
    minValue: 0,
    maxValue: "",
    defaultValue: "",
    allowUnlimited: true,
  });

  useEffect(() => {
    if (id) {
      QuotaTypeServices.getQuotaTypeById(id).then((res) => {
        const qt = res.data;
        setFormData({
          name: qt.name || "",
          code: qt.code || "",
          unit: qt.unit || "number",
          minValue: qt.minValue ?? 0,
          maxValue: qt.maxValue ?? "",
          defaultValue: qt.defaultValue ?? "",
          allowUnlimited: qt.allowUnlimited ?? true,
        });
      }).catch(() => {});
    } else {
      setFormData({
        name: "",
        code: "",
        unit: "number",
        minValue: 0,
        maxValue: "",
        defaultValue: "",
        allowUnlimited: true,
      });
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (id) {
        await QuotaTypeServices.updateQuotaType(id, formData);
        successMessage("Quota type updated successfully");
      } else {
        await QuotaTypeServices.createQuotaType(formData);
        successMessage("Quota type created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["quota-types"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || "Failed to save quota type"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditQuotaType") || "Edit Quota Type" : t("AddQuotaType") || "Add Quota Type"}
          description={
            id
              ? t("UpdateQuotaTypeDescription") || "Update quota type information"
              : t("AddQuotaTypeDescription") || "Add a new quota type"
          }
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form
          onSubmit={handleSubmit}
          className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Name")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Code")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Unit")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="number">Number</option>
                  <option value="gb">GB</option>
                  <option value="mb">MB</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Min")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  value={formData.minValue ?? ""}
                  onChange={(e) =>
                    handleChange("minValue", e.target.value === "" ? 0 : Number(e.target.value))
                  }
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Max")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  value={formData.maxValue ?? ""}
                  onChange={(e) =>
                    handleChange("maxValue", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Default")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  value={formData.defaultValue ?? ""}
                  onChange={(e) =>
                    handleChange("defaultValue", e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("UnlimitedAllowed") || "Unlimited allowed"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="checkbox"
                  checked={formData.allowUnlimited}
                  onChange={(e) =>
                    handleChange("allowUnlimited", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
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
              {id ? t("UpdateQuotaType") || "Update Quota Type" : t("AddQuotaType") || "Add Quota Type"}
            </PrimaryButton>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default QuotaTypeDrawer;
