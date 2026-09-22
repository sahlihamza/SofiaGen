import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, ModalBody, ModalFooter, Input, Select, Label } from "@windmill/react-ui";
import { FiSave } from "react-icons/fi";

import PaymentProviderServices from "@/services/PaymentProviderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const ProviderConfigModal = ({ isOpen, onClose, provider, onSuccess }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries(["platformPaymentProviders"]);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody>
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-xl font-medium text-gray-800 dark:text-gray-100 mb-1">
            {t("ConfigureProvider") || "Configure Payment Provider"}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {provider?.name} ({provider?.code})
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t("Environment") || "Environment"}</Label>
              <Select
                value={form.environment}
                onChange={(e) => handleChange("environment", e.target.value)}
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </Select>
            </div>

            <div>
              <Label>{t("APIKey") || "API Key"}</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              />
            </div>

            <div>
              <Label>{t("SecretKey") || "Secret Key"}</Label>
              <Input
                type="password"
                value={form.secretKey}
                onChange={(e) => handleChange("secretKey", e.target.value)}
                placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              />
            </div>

            <div>
              <Label>{t("WebhookSecret") || "Webhook Secret"}</Label>
              <Input
                type="password"
                value={form.webhookSecret}
                onChange={(e) => handleChange("webhookSecret", e.target.value)}
                placeholder={t("LeaveEmptyToKeepCurrent") || "Leave empty to keep current"}
              />
            </div>

            <div>
              <Label>{t("WebhookUrl") || "Webhook URL"}</Label>
              <Input
                value={form.webhookUrl}
                onChange={(e) => handleChange("webhookUrl", e.target.value)}
                placeholder="https://"
              />
            </div>
          </form>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button layout="outline" onClick={onClose}>
          {t("Cancel") || "Cancel"}
        </Button>
        <Button onClick={handleSubmit} isLoading={updateMutation.isLoading} iconLeft={FiSave}>
          {t("SaveConfiguration") || "Save Configuration"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ProviderConfigModal;
