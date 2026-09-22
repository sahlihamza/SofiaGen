import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiSave, FiX, FiPlus } from "react-icons/fi";

import PaymentProviderServices from "@/services/PaymentProviderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const ProviderCreateDrawer = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "gateway",
    status: "active",
    enabled: true,
    environment: "sandbox",
    mode: "sandbox",
    compatibleCountries: ["*"],
    compatibleCurrencies: ["*"],
    compatibleMethods: [],
    supportsOneTime: true,
    supportsOneTimePayment: true,
    supportsSubscription: true,
    supportsRefund: true,
    supportsCapture: true,
    supportsAuthorization: false,
    supportsDeferredPayment: false,
    supportsWebhook: true,
    display: { logo: "", color: "#6366f1" },
    metadata: { docsUrl: "" },
  });

  useEffect(() => {
    if (!isOpen) {
      setForm({
        code: "",
        name: "",
        description: "",
        type: "gateway",
        status: "active",
        enabled: true,
        environment: "sandbox",
        mode: "sandbox",
        compatibleCountries: ["*"],
        compatibleCurrencies: ["*"],
        compatibleMethods: [],
        supportsOneTime: true,
        supportsOneTimePayment: true,
        supportsSubscription: true,
        supportsRefund: true,
        supportsCapture: true,
        supportsAuthorization: false,
        supportsDeferredPayment: false,
        supportsWebhook: true,
        display: { logo: "", color: "#6366f1" },
        metadata: { docsUrl: "" },
      });
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: (body) => PaymentProviderServices.createProvider(body),
    onSuccess: () => {
      notifySuccess(t("ProviderCreated") || "Provider created");
      queryClient.invalidateQueries(["platformPaymentProviders"]);
      onClose();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message || "Create failed"),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value.split(",").map((v) => v.trim()).filter(Boolean) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { ...form };
    if (!body.code || !body.name) {
      notifyError(t("CodeAndNameRequired") || "Code and name are required");
      return;
    }
    createMutation.mutate(body);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {t("CreateProvider") || "Create Payment Provider"}
            </h3>
            <p className="text-sm text-gray-500">
              {t("CreateProviderDescription") || "Add a new payment provider"}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Code") || "Code"} *
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="stripe"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Name") || "Name"} *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Stripe"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Description") || "Description"}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows="2"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Type") || "Type"}
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="gateway">Gateway</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Status") || "Status"}
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Environment") || "Environment"}
              </label>
              <select
                value={form.environment}
                onChange={(e) => handleChange("environment", e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("Mode") || "Mode"}
              </label>
              <select
                value={form.mode}
                onChange={(e) => handleChange("mode", e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
                <option value="test">Test</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("CompatibleCountries") || "Compatible Countries"}
            </label>
            <input
              type="text"
              value={form.compatibleCountries.join(",")}
              onChange={(e) => handleArrayChange("compatibleCountries", e.target.value)}
              placeholder="* or tn,fr,us"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("CompatibleCurrencies") || "Compatible Currencies"}
            </label>
            <input
              type="text"
              value={form.compatibleCurrencies.join(",")}
              onChange={(e) => handleArrayChange("compatibleCurrencies", e.target.value)}
              placeholder="* or usd,eur,tnd"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("CompatibleMethods") || "Compatible Methods"}
            </label>
            <input
              type="text"
              value={form.compatibleMethods.join(",")}
              onChange={(e) => handleArrayChange("compatibleMethods", e.target.value)}
              placeholder="card,paypal,edinar"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("DisplayColor") || "Display Color"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.display.color}
                onChange={(e) => setForm((prev) => ({ ...prev, display: { ...prev.display, color: e.target.value } }))}
                className="h-10 w-14 rounded border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
              />
              <input
                type="text"
                value={form.display.color}
                onChange={(e) => setForm((prev) => ({ ...prev, display: { ...prev.display, color: e.target.value } }))}
                className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
          >
            {t("Cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isLoading ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FiSave className="mr-2" />
            )}
            {t("CreateProvider") || "Create Provider"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProviderCreateDrawer;
