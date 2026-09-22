import React, { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useQueryClient } from "@tanstack/react-query";
import { SecondaryButton, PrimaryButton } from "@sofia/ui";

// Internal import
import Title from "@/components/form/others/Title";
import FeatureServices from "@/services/FeatureServices";
import FeatureGroupServices from "@/services/FeatureGroupServices";
import useNotification from "@/hooks/useNotification";
import { SidebarContext } from "@/context/SidebarContext";

const FeatureDrawer = ({ id }) => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const queryClient = useQueryClient();
  const { successMessage, errorMessage } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featureGroups, setFeatureGroups] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    categoryId: "",
    featureGroupId: "",
    description: "",
    status: "active",
  });

  useEffect(() => {
    FeatureGroupServices.getAllFeatureGroups().then((res) => {
      setFeatureGroups(res.data.data || []);
    }).catch(() => {});
    if (id) {
      FeatureServices.getFeatureById(id).then((res) => {
        const feature = res.data;
        setFormData({
          name: feature.name || "",
          code: feature.code || "",
          categoryId: feature.categoryId?._id || feature.categoryId || "",
          featureGroupId: feature.featureGroupId?._id || feature.featureGroupId || "",
          description: feature.description || "",
          status: feature.status || "active",
        });
      }).catch(() => {});
    } else {
      setFormData({
        name: "",
        code: "",
        categoryId: "",
        featureGroupId: "",
        description: "",
        status: "active",
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
        await FeatureServices.updateFeature(id, formData);
        successMessage("Feature updated successfully");
      } else {
        await FeatureServices.createFeature(formData);
        successMessage("Feature created successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["features"] });
      toggleDrawer();
    } catch (err) {
      errorMessage(
        err?.response?.data?.message || "Failed to save feature"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          title={id ? t("EditFeature") || "Edit Feature" : t("AddFeature") || "Add Feature"}
          description={
            id
              ? t("UpdateFeatureDescription") || "Update feature information"
              : t("AddFeatureDescription") || "Add a new feature"
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
                {t("FeatureGroup") || "Feature Group"}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.featureGroupId}
                  onChange={(e) => handleChange("featureGroupId", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("SelectFeatureGroup") || "Select feature group"}</option>
                  {featureGroups.map((group) => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Category")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleChange("categoryId", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("SelectCategory") || "Select category"}</option>
                  <option value="billing">Billing</option>
                  <option value="limits">Limits</option>
                  <option value="access">Access</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Description")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows="3"
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
              <label className="col-span-4 sm:col-span-2 font-medium text-sm">
                {t("Status")}
              </label>
              <div className="col-span-8 sm:col-span-4">
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">{t("Active") || "Active"}</option>
                  <option value="inactive">{t("Inactive") || "Inactive"}</option>
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
              {id ? t("UpdateFeature") || "Update Feature" : t("AddFeature") || "Add Feature"}
            </PrimaryButton>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default FeatureDrawer;