import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { FiSave, FiX } from "react-icons/fi";

import PaymentProviderServices from "@/services/PaymentProviderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const ProviderConfigDrawer = ({ isOpen, onClose, provider, onSuccess }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    environment: "sandbox",
    apiKey: "",
    secretKey: "",
    webhookSecret: "",
    webhookUrl: "",
  });

  useEffect(() => {
    if (provider) {
      setForm({
        environment: provider.environment || "sandbox",
        apiKey: "",
        secretKey: "",
        webhookSecret: "",
        webhookUrl: provider.webhookUrl || "",
      });
    }
  }, [provider]);

  const updateMutation = useMutation({
    mutationFn: (body) => PaymentProviderServices.updateConfig(provider._id, body),
    onSuccess: () => {
      notifySuccess(t("ConfigurationUpdated") || "Configuration updated");
      onSuccess?.();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message || "Update failed"),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { ...form };
    if (!body.apiKey) delete body.apiKey;
    if (!body.secretKey) delete body.secretKey;
    if (!body.webhookSecret) delete body.webhookSecret;
    updateMutation.mutate(body);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {t("ConfigureProvider") || "Configure Payment Provider"}
            </h3>
            <p className="text-sm text-gray-500">
              {provider?.name} ({provider?.code})
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
              {t("APIKey") || "API Key"}
            </label>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => handleChange("apiKey", e.target.value)}
              placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("SecretKey") || "Secret Key"}
            </label>
            <input
              type="password"
              value={form.secretKey}
              onChange={(e) => handleChange("secretKey", e.target.value)}
              placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("WebhookSecret") || "Webhook Secret"}
            </label>
            <input
              type="password"
              value={form.webhookSecret}
              onChange={(e) => handleChange("webhookSecret", e.target.value)}
              placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("WebhookUrl") || "Webhook URL"}
            </label>
            <input
              type="url"
              value={form.webhookUrl}
              onChange={(e) => handleChange("webhookUrl", e.target.value)}
              placeholder="https://"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
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
            disabled={updateMutation.isLoading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {updateMutation.isLoading ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FiSave className="mr-2" />
            )}
            {t("SaveConfiguration") || "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProviderConfigDrawer;
