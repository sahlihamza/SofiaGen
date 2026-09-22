import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Label, Select, Badge, Modal, ModalHeader, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiCheckCircle, FiAlertCircle, FiPlus, FiTrash2 } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import aiAPI from "@/services/api/aiAPI";
import { useStoreContext } from "@/context/StoreContext";
import useGetCData from "@/hooks/useGetCData";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const PROVIDER_PRESETS = {
  openai: { baseUrl: "https://api.openai.com/v1", label: "OpenAI", models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-3.5-turbo"] },
  openai_compatible: { baseUrl: "", label: "OpenAI-Compatible (self-hosted / proxy)", models: [] },
  groq: { baseUrl: "https://api.groq.com/openai/v1", label: "Groq", models: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"] },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", label: "OpenRouter", models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"] },
  mistral: { baseUrl: "https://api.mistral.ai/v1", label: "Mistral", models: ["mistral-large-latest", "mistral-small-latest"] },
  anthropic: { baseUrl: "https://api.anthropic.com", label: "Anthropic (Claude)", models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"] },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com", label: "Google Gemini", models: ["gemini-1.5-flash", "gemini-1.5-pro"] },
  mock: { baseUrl: "", label: "Mock (development only)", models: [] },
};

const formatDate = (iso) => {
  if (!iso) return "â€”";
  try { return new Date(iso).toLocaleString(); } catch { return "â€”"; }

};

const AIProviders = () => {
  const { t } = useTranslation();
  const { currentStoreId } = useStoreContext() || {};
  const { hasPermission } = useGetCData();
  const queryClient = useQueryClient();

  const canManage = hasPermission("ai_assistant", "providers_manage");

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["aiProviders", currentStoreId],
    queryFn: () => aiAPI.listProviders(),
    enabled: Boolean(currentStoreId) && canManage,
  });

  const { data: usage } = useQuery({
    queryKey: ["aiUsage", currentStoreId],
    queryFn: () => aiAPI.getUsage(),
    enabled: Boolean(currentStoreId),
  });

  const upsertMutation = useMutation({
    mutationFn: (body) => aiAPI.upsertProvider(body),
    onSuccess: () => {
      notifySuccess(t("AIProviderSaved", { defaultValue: "Provider enregistrÃ©" }));

      queryClient.invalidateQueries(["aiProviders", currentStoreId]);
      setIsModalOpen(false);
      setEditing(null);
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message),
  });

  const [editing, setEditing] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openNew = () => {
    setEditing({ providerName: "openai", model: "", baseUrl: "", apiKey: "", enabled: true, isDefault: providers.length === 0 });
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing({
      _id: p._id,
      providerName: p.providerName,
      model: p.model || "",
      baseUrl: p.baseUrl || "",
      apiKey: "", // never pre-fill â€” backend only sends apiKeyLast4

      enabled: p.enabled !== false,
      isDefault: !!p.isDefault,
      softLimits: p.softLimits || {},
    });
    setIsModalOpen(true);
  };

  const submit = () => {
    if (!editing) return;
    upsertMutation.mutate({
      providerName: editing.providerName,
      model: editing.model,
      baseUrl: editing.baseUrl,
      apiKey: editing.apiKey || undefined, // empty string = leave unchanged
      enabled: editing.enabled,
      isDefault: editing.isDefault,
      softLimits: editing.softLimits,
    });
  };

  const preset = editing ? PROVIDER_PRESETS[editing.providerName] : null;

  if (!currentStoreId) {
    return (
      <div className="mx-auto w-full p-6">
        <PageTitle>{t("AIProviders", { defaultValue: "AI Providers" })}</PageTitle>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {t("SelectStoreFirst", { defaultValue: "SÃ©lectionnez une boutique pour configurer ses providers IA." })}

        </p>
      </div>
    );
  }

  return (
    <AnimatedContent>
      <div className="mx-auto w-full p-4 sm:p-6 lg:p-8">
        <PageTitle>{t("AIProviders", { defaultValue: "AI Providers" })}</PageTitle>
        <p className="mb-6 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          {t("AIProvidersDescription", {
            defaultValue:
              "Configurez le fournisseur d'IA utilisÃ© par Malla, l'assistant de votre boutique. Plusieurs providers peuvent coexister ; un seul est marquÃ© comme actif par dÃ©faut.",

          })}
        </p>

        <Card className="mb-6">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-700 md:px-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {t("AIUsage", { defaultValue: "Utilisation" })}
            </h3>
          </div>
          <CardBody>
            {usage ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.entries(usage).map(([key, val]) => (
                  <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{key}</p>
                    <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {val?.used ?? 0} / {val?.limit ?? "âˆž"} {val?.state ? `(${val.state})` : null}

                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">â€”</p>

            )}
          </CardBody>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-700 md:px-6">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {t("AIConfiguredProviders", { defaultValue: "Providers configurÃ©s" })}

            </h3>
            {canManage ? (
              <Button onClick={openNew} className="inline-flex items-center gap-2">
                <FiPlus /> {t("AIProviderAdd", { defaultValue: "Ajouter" })}
              </Button>
            ) : null}
          </div>
          <CardBody>
            {isLoading ? (
              <p className="text-sm text-gray-500">â€¦</p>
            ) : providers.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t("AIProviderNone", { defaultValue: "Aucun provider configurÃ© pour cette boutique. Malla utilisera le mode dÃ©mo (MockProvider)." })}

              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">ModÃ¨le</th>
                    <th className="px-3 py-2 text-left">Base URL</th>
                    <th className="px-3 py-2 text-left">API Key</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Mis Ã  jour</th>

                    <th />
                  </tr>
                </thead>
                <tbody>
                  {providers.map((p) => (
                    <tr key={p._id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 font-medium">{PROVIDER_PRESETS[p.providerName]?.label || p.providerName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.model || "â€”"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.baseUrl || "â€”"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{p.apiKeyLast4 ? `â€¢â€¢â€¢â€¢${p.apiKeyLast4}` : "â€”"}</td>
                      <td className="px-3 py-2">
                        {p.isDefault ? <Badge tone="positive">DÃ©faut</Badge> : null}
                        {p.enabled === false ? <Badge tone="neutral">DÃ©sactivÃ©</Badge> : null}

                      </td>
                      <td className="px-3 py-2">{formatDate(p.updatedAt)}</td>
                      <td className="px-3 py-2">
                        {canManage ? (
                          <Button size="small" layout="outline" onClick={() => openEdit(p)}>
                            {t("Edit", { defaultValue: "Modifier" })}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <ModalHeader>{editing?._id ? t("AIProviderEdit", { defaultValue: "Modifier le provider" }) : t("AIProviderAdd", { defaultValue: "Ajouter un provider" })}</ModalHeader>
          <ModalBody>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label>{t("AIProviderName", { defaultValue: "Provider" })}</Label>
                  <Select
                    value={editing.providerName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const p = PROVIDER_PRESETS[name];
                      setEditing((prev) => ({
                        ...prev,
                        providerName: name,
                        baseUrl: prev.baseUrl || p?.baseUrl || "",
                      }));
                    }}
                  >
                    {Object.entries(PROVIDER_PRESETS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{t("AIProviderModel", { defaultValue: "ModÃ¨le" })}</Label>

                  <Input
                    value={editing.model}
                    onChange={(e) => setEditing((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder={preset?.models?.[0] || "model-name"}
                  />
                  {preset?.models?.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {preset.models.map((m) => (
                        <Button
                          key={m}
                          type="button"
                          onClick={() => setEditing((prev) => ({ ...prev, model: m }))}
                          className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <Label>{t("AIProviderBaseUrl", { defaultValue: "Base URL (optionnel)" })}</Label>
                  <Input
                    value={editing.baseUrl}
                    onChange={(e) => setEditing((prev) => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder={preset?.baseUrl || "https://..."}
                  />
                </div>
                <div>
                  <Label>{t("AIProviderApiKey", { defaultValue: "API Key (laisser vide pour conserver)" })}</Label>
                  <Input
                    type="password"
                    value={editing.apiKey}
                    onChange={(e) => setEditing((prev) => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="â€¢â€¢â€¢â€¢"

                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.enabled}
                      onChange={(e) => setEditing((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    {t("AIProviderEnabled", { defaultValue: "ActivÃ©" })}

                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.isDefault}
                      onChange={(e) => setEditing((prev) => ({ ...prev, isDefault: e.target.checked }))}
                    />
                    {t("AIProviderDefault", { defaultValue: "Provider par dÃ©faut" })}

                  </label>
                </div>
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button layout="outline" onClick={() => setIsModalOpen(false)}>
              {t("Cancel", { defaultValue: "Annuler" })}
            </Button>
            <Button onClick={submit} disabled={upsertMutation.isLoading}>
              {t("Save", { defaultValue: "Enregistrer" })}
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </AnimatedContent>
  );
};

export default AIProviders;