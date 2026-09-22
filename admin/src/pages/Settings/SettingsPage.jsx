import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, Input, Select, Badge, Table, TableCell, TableContainer, TableHeader, TableRow } from "@windmill/react-ui";
import { FiMail, FiShield, FiSettings, FiExternalLink } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import settingsAPI from "@/services/api/settingsAPI";
import { notifyError, notifySuccess } from "@/utils/toast";
import PlatformSmtpSection from "@/components/settings/sections/PlatformSmtpSection";
import Uploader from "@/components/image-uploader/Uploader";
import { useBranding, refreshBranding } from "@/hooks/useBranding";
import { CButton } from "@/components/ui";
import { Button } from "@sofia/ui";

const SettingsPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["platformSettings"],
    queryFn: () => settingsAPI.getSettings(),
  });

  const { data: passwordPolicyData, isLoading: policyLoading } = useQuery({
    queryKey: ["passwordPolicy"],
    queryFn: () => settingsAPI.getPasswordPolicy(),
  });

  const { data: publicBranding } = useBranding();

  const [logo, setLogo] = useState(() => publicBranding?.logo || "");
  const [favicon, setFavicon] = useState(() => publicBranding?.favicon || "");
  const [logoInitialized, setLogoInitialized] = useState(false);
  const [faviconInitialized, setFaviconInitialized] = useState(false);

  useEffect(() => {
    if (publicBranding && !logoInitialized) {
      setLogo(publicBranding.logo || "");
      setLogoInitialized(true);
    }
  }, [publicBranding, logoInitialized]);

  useEffect(() => {
    if (publicBranding && !faviconInitialized) {
      setFavicon(publicBranding.favicon || "");
      setFaviconInitialized(true);
    }
  }, [publicBranding, faviconInitialized]);

  useEffect(() => {
    const data = settingsData?.data;
    if (!data) return;
    if (!logoInitialized && (data.logo || data.logo === "")) {
      setLogo(data.logo || "");
      setLogoInitialized(true);
    }
    if (!faviconInitialized && (data.favicon || data.favicon === "")) {
      setFavicon(data.favicon || "");
      setFaviconInitialized(true);
    }
  }, [settingsData, logoInitialized, faviconInitialized]);

  const updateSettingsMutation = useMutation({
    mutationFn: (body) => settingsAPI.updateSettings(body),
    onSuccess: () => {
      notifySuccess(t("SettingsUpdatedSuccess"));
      queryClient.invalidateQueries(["platformSettings"]);
      refreshBranding();
    },
    onError: (err) => {
      notifyError(err?.response?.data?.message || err?.message);
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: (body) => settingsAPI.updatePasswordPolicy(body),
    onSuccess: () => {
      notifySuccess(t("PolicyUpdatedSuccess"));
      queryClient.invalidateQueries(["passwordPolicy"]);
    },
    onError: (err) => {
      notifyError(err?.response?.data?.message || err?.message);
    },
  });

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    body.logo = logo;
    body.favicon = favicon;
    updateSettingsMutation.mutate(body);
  };

  const handlePolicySubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    updatePolicyMutation.mutate(body);
  };

  const settings = settingsData?.data || {};
  const policy = passwordPolicyData?.data || {};

  return (
    <div className="mx-auto w-full">
      <PageTitle>{t("PlatformSettings")}</PageTitle>

      {settingsLoading || policyLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Platform settings sections">
            {[
              { id: "general", label: t("GeneralSettings"), icon: FiSettings },
              { id: "smtp", label: "Email / SMTP", icon: FiMail },
              { id: "policy", label: t("PasswordPolicy"), icon: FiShield },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                    active
                      ? "border-cyan-600 text-cyan-700 dark:text-cyan-300"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {activeTab === "general" && (
          <Card>
            <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {t("GeneralSettings")}
              </h3>
            </div>
            <CardBody>
              <form onSubmit={handleSettingsSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("SiteName")}
                    </label>
                    <Input
                      name="siteName"
                      defaultValue={settings.siteName || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("DefaultCurrency")}
                    </label>
                    <Select name="currency" defaultValue={settings.currency || "USD"}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="XOF">XOF</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("TimeZone")}
                    </label>
                    <Input name="timezone" defaultValue={settings.timezone || ""} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("ItemsPerPage")}
                    </label>
                    <Input
                      name="itemsPerPage"
                      type="number"
                      defaultValue={settings.itemsPerPage || 10}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Site marketing
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        name="marketingSiteUrl"
                        type="url"
                        defaultValue={settings.marketingSiteUrl || "http://localhost:3002"}
                        placeholder="https://sofiagen.com"
                      />
                      <a
                        href={settings.marketingSiteUrl || "http://localhost:3002"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                        title="Ouvrir le site marketing"
                      >
                        <FiExternalLink className="h-4 w-4" />
                        Ouvrir
                      </a>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      NumÃ©ro WhatsApp du support
                    </label>
                    <Input
                      name="whatsappNumber"
                      type="tel"
                      defaultValue={settings.whatsappNumber || ""}
                      placeholder="+216 XX XXX XXX"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Entre 8 et 15 chiffres. Il sera utilisÃ© par le bouton WhatsApp du site marketing.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("PlatformLogo")}
                    </label>
                    <Uploader
                      imageUrl={logo}
                      setImageUrl={setLogo}
                      folder="branding"
                      alt="logo"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("Favicon")}
                    </label>
                    <Uploader
                      imageUrl={favicon}
                      setImageUrl={setFavicon}
                      folder="branding"
                      alt="favicon"
                      targetWidth={128}
                      targetHeight={128}
                    />
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <CButton
                    type="submit"
                    icon="save"
                    loading={updateSettingsMutation.isPending}
                  >
                    {t("SaveSettings")}
                  </CButton>
                  <CButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries(["platformSettings"]);
                      queryClient.invalidateQueries(["publicBranding"]);
                      setLogoInitialized(false);
                      setFaviconInitialized(false);
                    }}
                    icon="refresh"
                  >
                    {t("Refresh")}
                  </CButton>
                </div>
              </form>
            </CardBody>
          </Card>
          )}

          {activeTab === "smtp" && <PlatformSmtpSection />}

          {activeTab === "policy" && (
          <Card>
            <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {t("PasswordPolicy")}
              </h3>
            </div>
            <CardBody>
              <form onSubmit={handlePolicySubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("MinPasswordLength")}
                    </label>
                    <Input
                      name="minLength"
                      type="number"
                      defaultValue={policy.minLength || 8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("RequireUppercase")}
                    </label>
                    <Select name="requireUppercase" defaultValue={policy.requireUppercase ? "true" : "false"}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("RequireNumbers")}
                    </label>
                    <Select name="requireNumbers" defaultValue={policy.requireNumbers ? "true" : "false"}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t("RequireSpecialChars")}
                    </label>
                    <Select name="requireSpecialChars" defaultValue={policy.requireSpecialChars ? "true" : "false"}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <CButton
                    type="submit"
                    icon="save"
                    loading={updatePolicyMutation.isPending}
                  >
                    {t("SavePolicy")}
                  </CButton>
                </div>
              </form>
            </CardBody>
          </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;