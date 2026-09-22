import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";
import { SecondaryButton, PrimaryButton, Button } from "@sofia/ui";

// Internal import
import Title from "@/components/form/others/Title";
import FeatureGroupServices from "@/services/FeatureGroupServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const STATUSES = ["active", "inactive", "archived"];
const COLORS = [
  "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
  "#6366F1", "#EC4899", "#14B8A6", "#F97316", "#22C55E", "#64748B",
];

const FeatureGroupDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    icon: "",
    color: "#3B82F6",
    displayOrder: 0,
    status: "active",
  });

  useEffect(() => {
    if (id) {
      FeatureGroupServices.getFeatureGroupById(id).then((res) => {
        const g = res.data;
        setFormData({
          name: g.name || "",
          code: g.code || "",
          description: g.description || "",
          icon: g.icon || "",
          color: g.color || "#3B82F6",
          displayOrder: g.displayOrder ?? 0,
          status: g.status || "active",
        });
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        code: formData.code.toLowerCase().trim(),
        displayOrder: Number(formData.displayOrder || 0),
      };
      if (id) {
        await FeatureGroupServices.updateFeatureGroup(id, payload);
        successMessage("Feature group updated successfully");
      } else {
        await FeatureGroupServices.createFeatureGroup(payload);
        successMessage("Feature group created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["feature-groups"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(err?.response?.data?.message || "Failed to save feature group");
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
          title={id ? t("EditFeatureGroup") || "Edit Feature Group" : t("AddFeatureGroup") || "Add Feature Group"}
          description={
            id
              ? t("UpdateFeatureGroupDescription") || "Update feature group information"
              : t("AddFeatureGroupDescription") || "Create a new feature group (Catalog, Orders, API...)"
          }
        />
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit} className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
          <div className="space-y-6">
            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Name")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={inputCls}
                  placeholder="Catalog"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Code")}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="text"
                  value={formData.code}
                  disabled={!!id}
                  onChange={(e) => handleChange("code", e.target.value)}
                  className={inputCls}
                  placeholder="catalog"
                />
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
                  placeholder="FiPackage"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("Color")}</label>
              <div className="col-span-8 sm:col-span-4 flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange("color", c)}
                    className={`h-6 w-6 rounded-full p-0 ${formData.color === c ? "ring-2 ring-offset-2 ring-gray-900" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">{t("DisplayOrder") || "Display Order"}</label>
              <div className="col-span-8 sm:col-span-4">
                <input
                  type="number"
                  min="0"
                  value={formData.displayOrder}
                  onChange={(e) => handleChange("displayOrder", e.target.value)}
                  className={inputCls}
                />
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
              {id ? t("UpdateFeatureGroup") || "Update Feature Group" : t("AddFeatureGroup") || "Add Feature Group"}
            </PrimaryButton>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default FeatureGroupDrawer;
