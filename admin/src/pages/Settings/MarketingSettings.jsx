import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Label, Badge } from "@windmill/react-ui";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCopy,
  FiExternalLink,
  FiActivity,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import { CButton } from "@/components/ui";
import MarketingSettingsServices from "@/services/MarketingSettingsServices";
import useGetCData from "@/hooks/useGetCData";
import { useNotification } from "@/hooks/useNotification";
import { useStoreContext } from "@/context/StoreContext";

const StatusDot = ({ status, label }) => {
  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-red-500"
        : "bg-amber-400";
  const Icon =
    status === "ok" ? FiCheckCircle : status === "failed" ? FiXCircle : FiAlertCircle;
  const tone =
    status === "ok"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "failed"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
};

const Section = ({ title, description, children, right }) => (
  <Card className="mb-6">
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-700 dark:bg-gray-700 md:px-6">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
    <CardBody>{children}</CardBody>
  </Card>
);

const MarketingSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const { currentStoreId } = useStoreContext() || {};

  const canView = hasPermission("marketing", "view");
  const canUpdate = hasPermission("marketing", "update");
  const canTest = hasPermission("marketing", "test");

  const [form, setForm] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["marketingSettings", currentStoreId],
    queryFn: () => MarketingSettingsServices.getSettings(currentStoreId),
    enabled: Boolean(currentStoreId) && canView,
  });

  useEffect(() => {
    if (data?.data) {
      const d = data.data;
      setForm({
        meta: {
          pixelEnabled: Boolean(d.meta?.pixelEnabled),
          pixelId: d.meta?.pixelId || "",
          capiEnabled: Boolean(d.meta?.capiEnabled),
          capiPixelId: d.meta?.capiPixelId || "",
          capiAccessToken: "",
          domainVerificationCode: d.meta?.domainVerificationCode || "",
        },
        google: {
          analyticsEnabled: Boolean(d.google?.analyticsEnabled),
          measurementId: d.google?.measurementId || "",
          searchConsoleVerification: d.google?.searchConsoleVerification || "",
        },
        sitemap: {
          enabled: d.sitemap?.enabled !== false,
          includeProducts: d.sitemap?.includeProducts !== false,
          includeCategories: d.sitemap?.includeCategories !== false,
          customUrls: Array.isArray(d.sitemap?.customUrls) ? d.sitemap.customUrls : [],
        },
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body) => MarketingSettingsServices.updateSettings(currentStoreId, body),
    onSuccess: () => {
      successMessage(t("MarketingSettingsSaved", { defaultValue: "ParamÃ¨tres marketing enregistrÃ©s" }));

      queryClient.invalidateQueries(["marketingSettings", currentStoreId]);
    },
    onError: (err) => {
      const apiMessage = err?.response?.data?.message;
      const fieldErrors = err?.response?.data?.errors;
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        errorMessage(fieldErrors.map((e) => `${e.field}: ${e.message}`).join(" / "));
      } else {
        errorMessage(apiMessage || err?.message);
      }
    },
  });

  const testMetaMutation = useMutation({
    mutationFn: () => MarketingSettingsServices.testMeta(currentStoreId),
    onSuccess: (res) => {
      if (res?.data?.ok) {
        successMessage(t("MarketingTestSuccess", { defaultValue: "Connexion rÃ©ussie" }));

      } else {
        errorMessage(res?.data?.message || t("MarketingTestFailed", { defaultValue: "Connexion impossible" }));
      }
      queryClient.invalidateQueries(["marketingSettings", currentStoreId]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message),
  });

  const testGa4Mutation = useMutation({
    mutationFn: () => MarketingSettingsServices.testGa4(currentStoreId),
    onSuccess: (res) => {
      if (res?.data?.ok) {
        successMessage(t("MarketingTestSuccess", { defaultValue: "Connexion rÃ©ussie" }));

      } else {
        errorMessage(res?.data?.message || t("MarketingTestFailed", { defaultValue: "Connexion impossible" }));
      }
      queryClient.invalidateQueries(["marketingSettings", currentStoreId]);
    },
    onError: (err) => errorMessage(err?.response?.data?.message || err?.message),
  });

  const updateField = (group, key, value) => {
    setForm((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));
  };

  const handleSave = () => {
    if (!form) return;
    const payload = {
      meta: {
        ...form.meta,
        capiAccessToken: form.meta.capiAccessToken || undefined,
      },
      google: form.google,
      sitemap: form.sitemap,
    };
    updateMutation.mutate(payload);
  };

  const metaStatus = data?.data?.meta?.lastTestStatus;
  const gaStatus = data?.data?.google?.lastTestStatus;
  const sitemapUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/sitemap.xml`;
  }, []);

  const copySitemap = async () => {
    try {
      await navigator.clipboard.writeText(sitemapUrl);
      successMessage(t("Copied", { defaultValue: "CopiÃ©" }));

    } catch (err) {
      errorMessage(err?.message);
    }
  };

  if (!currentStoreId) {
    return (
      <div className="mx-auto w-full p-6">
        <PageTitle>{t("MarketingSettings", { defaultValue: "ParamÃ¨tres Marketing" })}</PageTitle>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {t("SelectStoreFirst", { defaultValue: "SÃ©lectionnez une boutique pour gÃ©rer ses paramÃ¨tres marketing." })}

        </p>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="mx-auto w-full p-6">
        <PageTitle>{t("MarketingSettings", { defaultValue: "ParamÃ¨tres Marketing" })}</PageTitle>

        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-gray-200" />
          <div className="h-32 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <AnimatedContent>
      <div className="mx-auto w-full p-4 sm:p-6 lg:p-8">
        <PageTitle>{t("MarketingSettings", { defaultValue: "ParamÃ¨tres Marketing" })}</PageTitle>
        <p className="mb-6 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          {t("MarketingSettingsDescription", {
            defaultValue:
              "Configurez les outils de tracking, publicitÃ© et rÃ©fÃ©rencement de votre boutique. Chaque intÃ©gration peut Ãªtre activÃ©e ou dÃ©sactivÃ©e indÃ©pendamment.",

          })}
        </p>

        <Section
          title={t("MarketingMetaPixel", { defaultValue: "Meta Pixel (Facebook Pixel)" })}
          description={t("MarketingMetaPixelDesc", {
            defaultValue:
              "Suivez les conversions et construisez des audiences Meta Ã  partir du trafic de votre boutique.",

          })}
          right={
            <StatusDot
              status={form.meta.pixelEnabled ? (metaStatus || "ok") : "unknown"}
              label={
                form.meta.pixelEnabled
                  ? t("MarketingActive", { defaultValue: "Actif" })
                  : t("MarketingInactive", { defaultValue: "Inactif" })
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <SwitchToggle
                id="meta-pixel-toggle"
                title={t("MarketingEnableMetaPixel", { defaultValue: "Activer Meta Pixel" })}
                processOption={form.meta.pixelEnabled}
                handleProcess={(v) => updateField("meta", "pixelEnabled", v)}
              />
            </div>
            <div>
              <Label>{t("MarketingPixelId", { defaultValue: "Pixel ID" })}</Label>
              <Input
                name="meta.pixelId"
                value={form.meta.pixelId}
                onChange={(e) => updateField("meta", "pixelId", e.target.value)}
                placeholder="123456789012345"
                disabled={!canUpdate}
              />
            </div>
            <div>
              <Label>
                {t("MarketingDomainVerification", { defaultValue: "VÃ©rification du domaine Facebook" })}

              </Label>
              <Input
                name="meta.domainVerificationCode"
                value={form.meta.domainVerificationCode}
                onChange={(e) => updateField("meta", "domainVerificationCode", e.target.value)}
                placeholder="abc123â€¦"

                disabled={!canUpdate}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("MarketingDomainVerificationHelp", {
                  defaultValue:
                    "GÃ©nÃ¨re automatiquement la balise <meta name=\"facebook-domain-verification\" />.",

                })}
              </p>
            </div>
          </div>
        </Section>

        <Section
          title={t("MarketingCapi", { defaultValue: "Meta Conversions API" })}
          description={t("MarketingCapiDesc", {
            defaultValue:
              "Envoyez les Ã©vÃ©nements Meta cÃ´tÃ© serveur. RecommandÃ© pour dÃ©dupliquer les conversions navigateur/serveur via event_id.",

          })}
          right={
            <div className="flex items-center gap-2">
              <Badge tone={form.meta.capiEnabled ? "positive" : "neutral"}>
                {form.meta.capiEnabled
                  ? t("MarketingActive", { defaultValue: "Actif" })
                  : t("MarketingInactive", { defaultValue: "Inactif" })}
              </Badge>
              {data?.data?.meta?.hasCapiToken ? (
                <Badge tone="positive">
                  {t("MarketingTokenConfigured", { defaultValue: "Token enregistrÃ©" })}

                </Badge>
              ) : null}
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <SwitchToggle
                id="capi-toggle"
                title={t("MarketingEnableCapi", { defaultValue: "Activer l'API Conversions" })}
                processOption={form.meta.capiEnabled}
                handleProcess={(v) => updateField("meta", "capiEnabled", v)}
              />
            </div>
            <div>
              <Label>{t("MarketingPixelId", { defaultValue: "Pixel ID" })}</Label>
              <Input
                name="meta.capiPixelId"
                value={form.meta.capiPixelId}
                onChange={(e) => updateField("meta", "capiPixelId", e.target.value)}
                placeholder="123456789012345"
                disabled={!canUpdate}
              />
            </div>
            <div>
              <Label>{t("MarketingCapiToken", { defaultValue: "Access Token" })}</Label>
              <Input
                name="meta.capiAccessToken"
                type="password"
                value={form.meta.capiAccessToken}
                onChange={(e) => updateField("meta", "capiAccessToken", e.target.value)}
                placeholder={
                  data?.data?.meta?.hasCapiToken
                    ? t("MarketingTokenKeep", { defaultValue: "Laisser vide pour conserver le token actuel" })
                    : "EAABâ€¦"

                }
                autoComplete="new-password"
                disabled={!canUpdate}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("MarketingCapiTokenHelp", {
                  defaultValue:
                    "StockÃ© chiffrÃ©. Jamais renvoyÃ© en clair, jamais exposÃ© au storefront.",

                })}
              </p>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <CButton
                type="button"
                variant="outline"
                icon="check"
                onClick={() => testMetaMutation.mutate()}
                disabled={!canTest || testMetaMutation.isPending}
                loading={testMetaMutation.isPending}
              >
                {t("MarketingTestConnection", { defaultValue: "Tester la connexion" })}
              </CButton>
              {metaStatus === "failed" && data?.data?.meta?.lastTestMessage ? (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {data.data.meta.lastTestMessage}
                </p>
              ) : null}
            </div>
          </div>
        </Section>

        <Section
          title={t("MarketingGa4", { defaultValue: "Google Analytics 4" })}
          description={t("MarketingGa4Desc", {
            defaultValue: "Mesurez le trafic et les conversions e-commerce GA4.",
          })}
          right={
            <StatusDot
              status={form.google.analyticsEnabled ? (gaStatus || "ok") : "unknown"}
              label={
                form.google.analyticsEnabled
                  ? t("MarketingActive", { defaultValue: "Actif" })
                  : t("MarketingInactive", { defaultValue: "Inactif" })
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <SwitchToggle
                id="ga4-toggle"
                title={t("MarketingEnableGa4", { defaultValue: "Activer Google Analytics 4" })}
                processOption={form.google.analyticsEnabled}
                handleProcess={(v) => updateField("google", "analyticsEnabled", v)}
              />
            </div>
            <div>
              <Label>{t("MarketingMeasurementId", { defaultValue: "Measurement ID" })}</Label>
              <Input
                name="google.measurementId"
                value={form.google.measurementId}
                onChange={(e) => updateField("google", "measurementId", e.target.value)}
                placeholder="G-XXXXXXXX"
                disabled={!canUpdate}
              />
            </div>
            <div>
              <Label>{t("MarketingSearchConsole", { defaultValue: "Google Search Console" })}</Label>
              <Input
                name="google.searchConsoleVerification"
                value={form.google.searchConsoleVerification}
                onChange={(e) =>
                  updateField("google", "searchConsoleVerification", e.target.value)
                }
                placeholder="abc123â€¦"

                disabled={!canUpdate}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("MarketingSearchConsoleHelp", {
                  defaultValue:
                    "GÃ©nÃ¨re <meta name=\"google-site-verification\" content=\"â€¦\" /> cÃ´tÃ© storefront.",

                })}
              </p>
            </div>
            <div className="md:col-span-2">
              <CButton
                type="button"
                variant="outline"
                icon="check"
                onClick={() => testGa4Mutation.mutate()}
                disabled={!canTest || testGa4Mutation.isPending}
                loading={testGa4Mutation.isPending}
              >
                {t("MarketingTestConnection", { defaultValue: "Tester la connexion" })}
              </CButton>
            </div>
          </div>
        </Section>

        <Section
          title={t("MarketingSitemap", { defaultValue: "Sitemap XML" })}
          description={t("MarketingSitemapDesc", {
            defaultValue:
              "GÃ©nÃ©ration dynamique : produits publiÃ©s, catÃ©gories publiÃ©es, URLs personnalisÃ©es.",

          })}
          right={
            <Badge tone={form.sitemap.enabled ? "positive" : "neutral"}>
              {form.sitemap.enabled
                ? t("MarketingEnabled", { defaultValue: "ActivÃ©" })
                : t("MarketingDisabled", { defaultValue: "DÃ©sactivÃ©" })}

            </Badge>
          }
        >
          <div className="space-y-4">
            <SwitchToggle
              id="sitemap-toggle"
              title={t("MarketingSitemapEnabled", { defaultValue: "Sitemap actif" })}
              processOption={form.sitemap.enabled}
              handleProcess={(v) => updateField("sitemap", "enabled", v)}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {sitemapUrl || "/sitemap.xml"}
              </code>
              <CButton
                type="button"
                variant="outline"
                icon={<FiCopy className="h-4 w-4" />}
                onClick={copySitemap}
                disabled={!sitemapUrl}
              >
                {t("Copy", { defaultValue: "Copier" })}
              </CButton>
              <a
                href={sitemapUrl || "/sitemap.xml"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <FiExternalLink className="h-4 w-4" />
                {t("Open", { defaultValue: "Ouvrir" })}
              </a>
            </div>
          </div>
        </Section>

        <div className="mt-6 flex items-center justify-end gap-3">
          <CButton
            type="button"
            icon="save"
            onClick={handleSave}
            disabled={!canUpdate || updateMutation.isPending}
            loading={updateMutation.isPending}
          >
            {t("SaveSettings", { defaultValue: "Enregistrer" })}
          </CButton>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          <FiActivity className="mr-1 inline h-3.5 w-3.5" />
          {t("MarketingConsentHint", {
            defaultValue:
              "Le tracking est chargÃ© en l'Ã©tat. La gestion du consentement (Analytics / Marketing) peut Ãªtre ajoutÃ©e ultÃ©rieurement sans refonte.",

          })}
        </p>
      </div>
    </AnimatedContent>
  );
};

export default MarketingSettings;