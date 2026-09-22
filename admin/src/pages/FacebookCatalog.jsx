import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Card, CardBody, Input, Label, Badge, Modal, ModalHeader, ModalBody, ModalFooter } from "@windmill/react-ui";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCopy,
  FiExternalLink,
  FiRefreshCcw,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import useFacebookCatalogSubmit from "@/hooks/useFacebookCatalogSubmit";
import { useStoreContext } from "@/context/StoreContext";
import useGetCData from "@/hooks/useGetCData";
import { notifySuccess, notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const StatusDot = ({ status, label }) => {
  const color =
    status === "success"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "partial"
          ? "bg-amber-400"
          : "bg-gray-400";
  const tone =
    status === "success"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : status === "failed"
        ? "text-red-700 bg-red-50 border-red-200"
        : status === "partial"
          ? "text-amber-700 bg-amber-50 border-amber-200"
          : "text-gray-600 bg-gray-50 border-gray-200";
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
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

const formatDate = (iso) => {
  if (!iso) return "â€”";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "â€”";

  }
};

const FacebookCatalog = () => {
  const { t } = useTranslation();
  const { currentStoreId, stores = [] } = useStoreContext() || {};
  const { hasPermission } = useGetCData();

  const canView = hasPermission("integrations", "view");
  const canUpdate = hasPermission("integrations", "update");

  const currentStore = useMemo(
    () => (stores || []).find((s) => String(s._id) === String(currentStoreId)) || null,
    [stores, currentStoreId]
  );
  const slug = currentStore?.slug || "";

  const {
    settings,
    status,
    isLoading,
    isSaving,
    isRegenerating,
    testResult,
    setTestResult,
    saveSettings,
    regenerate,
    runTest,
  } = useFacebookCatalogSubmit();

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [previewItems, setPreviewItems] = useState(null);

  const feedUrl = useMemo(() => {
    if (typeof window === "undefined" || !slug) return "";
    return `${window.location.origin}/api/public/facebook-catalog/${slug}/feed.xml`;
  }, [slug]);

  useEffect(() => {
    if (testResult) setIsTestModalOpen(true);
  }, [testResult]);

  const onToggleEnabled = (v) => saveSettings({ enabled: v });
  const onToggleOption = (key, v) => saveSettings({ [key]: v });

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      notifySuccess(t("Copied", { defaultValue: "CopiÃ©" }));

    } catch (err) {
      notifyError(err?.message);
    }
  };

  if (!currentStoreId) {
    return (
      <div className="mx-auto w-full p-6">
        <PageTitle>{t("FacebookCatalog", { defaultValue: "Catalogue Facebook" })}</PageTitle>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {t("SelectStoreFirst", { defaultValue: "SÃ©lectionnez une boutique pour configurer le flux Facebook." })}

        </p>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="mx-auto w-full p-6">
        <PageTitle>{t("FacebookCatalog", { defaultValue: "Catalogue Facebook" })}</PageTitle>
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
        <PageTitle>{t("FacebookCatalog", { defaultValue: "Catalogue Facebook" })}</PageTitle>
        <p className="mb-6 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
          {t("FacebookCatalogDescription", {
            defaultValue:
              "GÃ©nÃ©rez un flux produit compatible avec Meta Commerce Manager pour importer automatiquement vos produits dans un catalogue Facebook.",

          })}
        </p>

        <Section
          title={t("FacebookCatalogActivation", { defaultValue: "Activation du flux" })}
          description={t("FacebookCatalogActivationDesc", {
            defaultValue:
              "Activez le flux pour rendre l'URL publique accessible par Meta Commerce Manager.",
          })}
          right={
            <StatusDot
              status={settings.enabled ? "success" : "unknown"}
              label={settings.enabled ? t("Active", { defaultValue: "Actif" }) : t("Inactive", { defaultValue: "Inactif" })}
            />
          }
        >
          <SwitchToggle
            id="fb-catalog-enabled"
            title={t("FacebookCatalogEnable", { defaultValue: "Activer le Flux Produits" })}
            processOption={settings.enabled}
            handleProcess={onToggleEnabled}
            disabled={!canUpdate || isSaving}
          />
        </Section>

        <Section
          title={t("FacebookCatalogOptions", { defaultValue: "Options du flux" })}
          description={t("FacebookCatalogOptionsDesc", {
            defaultValue: "Affinez le contenu de votre flux produit.",
          })}
        >
          <div className="space-y-4">
            <SwitchToggle
              id="fb-catalog-include-out-of-stock"
              title={t("FacebookCatalogIncludeOutOfStock", {
                defaultValue: "Inclure les produits en rupture de stock",
              })}
              processOption={settings.includeOutOfStock}
              handleProcess={(v) => onToggleOption("includeOutOfStock", v)}
              disabled={!canUpdate || isSaving}
            />
            <SwitchToggle
              id="fb-catalog-include-variations"
              title={t("FacebookCatalogIncludeVariations", {
                defaultValue: "Inclure les variantes de produits",
              })}
              processOption={settings.includeVariations}
              handleProcess={(v) => onToggleOption("includeVariations", v)}
              disabled={!canUpdate || isSaving}
            />
            <SwitchToggle
              id="fb-catalog-include-inactive"
              title={t("FacebookCatalogIncludeInactive", {
                defaultValue: "Inclure les produits inactifs",
              })}
              processOption={settings.includeInactive}
              handleProcess={(v) => onToggleOption("includeInactive", v)}
              disabled={!canUpdate || isSaving}
            />
          </div>
        </Section>

        <Section
          title={t("FacebookCatalogFeedUrl", { defaultValue: "URL du flux" })}
          description={t("FacebookCatalogFeedUrlDesc", {
            defaultValue: "Cette URL est unique Ã  votre boutique. Donnez-la Ã  Meta Commerce Manager.",

          })}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              readOnly
              value={feedUrl}
              className="flex-1 font-mono text-xs"
            />
            <Button onClick={copyUrl} disabled={!feedUrl} className="inline-flex items-center gap-2">
              <FiCopy /> {t("Copy", { defaultValue: "Copier" })}
            </Button>
            <a
              href={feedUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 ${!feedUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              <FiExternalLink /> {t("OpenFeed", { defaultValue: "Ouvrir le flux" })}
            </a>
          </div>
        </Section>

        <Section
          title={t("FacebookCatalogStatus", { defaultValue: "Statut du flux" })}
          description={t("FacebookCatalogStatusDesc", {
            defaultValue: "Ã‰tat actuel du flux et indicateurs clÃ©s.",

          })}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("FacebookCatalogProductCount", { defaultValue: "Produits" })}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-gray-100">
                {status?.lastProductCount ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("FacebookCatalogLastGenerated", { defaultValue: "DerniÃ¨re gÃ©nÃ©ration" })}

              </p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {formatDate(status?.lastGeneratedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("FacebookCatalogLastAccess", { defaultValue: "Dernier accÃ¨s Meta" })}

              </p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {formatDate(status?.lastAccessedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("FacebookCatalogLastError", { defaultValue: "DerniÃ¨re erreur" })}

              </p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {status?.lastError || t("None", { defaultValue: "Aucune" })}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={regenerate} disabled={!canUpdate || isRegenerating} className="inline-flex items-center gap-2">
              <FiRefreshCcw />
              {isRegenerating
                ? t("Working", { defaultValue: "En coursâ€¦" })
                : t("FacebookCatalogRegenerate", { defaultValue: "RÃ©gÃ©nÃ©rer maintenant" })}

            </Button>
            <Button layout="outline" onClick={runTest} disabled={isRegenerating}>
              {t("FacebookCatalogTest", { defaultValue: "Tester le flux" })}
            </Button>
            <a
              href={feedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {t("OpenFeed", { defaultValue: "Ouvrir le flux" })} â†’

            </a>
          </div>
        </Section>

        <Section
          title={t("FacebookCatalogPreview", { defaultValue: "AperÃ§u d'un produit" })}
          description={t("FacebookCatalogPreviewDesc", {
            defaultValue: "Visualisez le XML d'un produit tel qu'il apparaÃ®tra dans le flux.",

          })}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>{t("FacebookCatalogProductId", { defaultValue: "ID du produit" })}</Label>
              <Input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="ObjectId du produit"
              />
            </div>
            <Button
              layout="outline"
              onClick={async () => {
                if (!productId) return;
                try {
                  const FacebookCatalogServices = (await import("@/services/FacebookCatalogServices")).default;
                  const res = await FacebookCatalogServices.previewProduct(currentStoreId, productId);
                  setPreviewItems(res?.data || []);
                } catch (err) {
                  notifyError(err?.response?.data?.message || err?.message);
                }
              }}
            >
              {t("FacebookCatalogPreviewBtn", { defaultValue: "Voir un aperÃ§u" })}

            </Button>
          </div>
          {previewItems && previewItems.length > 0 ? (
            <div className="mt-4 space-y-3">
              {previewItems.map((p, idx) => (
                <div key={idx} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ID: {p.item.id} â€” {p.item.title} â€” {p.item.price || "â€”"} â€” {p.item.availability}

                  </p>
                  {p.errors && p.errors.length > 0 ? (
                    <p className="mt-1 text-xs text-red-600">{p.errors.join(", ")}</p>
                  ) : null}
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-2 text-xs text-gray-100">
                    {p.xml}
                  </pre>
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)}>
          <ModalHeader>
            {testResult?.valid
              ? t("FacebookCatalogTestValid", { defaultValue: "Flux valide" })
              : t("FacebookCatalogTestPartial", { defaultValue: "Flux partiellement valide" })}
          </ModalHeader>
          <ModalBody>
            {testResult ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="positive">
                    {t("FacebookCatalogTestValid", { defaultValue: "Valides" })} : {testResult.totalProducts}
                  </Badge>
                  <Badge tone={testResult.invalidProducts > 0 ? "negative" : "neutral"}>
                    {t("FacebookCatalogTestInvalid", { defaultValue: "Erreurs" })} : {testResult.invalidProducts}
                  </Badge>
                  <Badge tone="neutral">
                    {t("FacebookCatalogTestDuration", { defaultValue: "DurÃ©e" })} : {testResult.durationMs} ms

                  </Badge>
                </div>
                {testResult.errors && testResult.errors.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Produit</th>
                        <th className="px-3 py-2 text-left">Erreur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testResult.errors.map((e, i) => (
                        <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-2 font-mono text-xs">{e.productId}</td>
                          <td className="px-3 py-2 text-red-700 dark:text-red-400">{e.errors.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button layout="outline" onClick={() => setIsTestModalOpen(false)}>
              {t("Close", { defaultValue: "Fermer" })}
            </Button>
          </ModalFooter>
        </Modal>

        {canView ? null : (
          <p className="mt-4 text-sm text-amber-700">{t("NoPermission", { defaultValue: "Vous n'avez pas la permission d'afficher cette page." })}</p>
        )}
      </div>
    </AnimatedContent>
  );
};

export default FacebookCatalog;