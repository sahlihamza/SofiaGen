import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiChevronLeft,
  FiMonitor,
  FiSmartphone,
  FiSend,
} from "react-icons/fi";

//internal import
import CStatusSwitch from "@/components/ui/CStatusSwitch";
import Uploader from "@/components/image-uploader/Uploader";
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import { getEmailNotificationDisplayText } from "@/utils/emailNotifications";
import { Button } from "@sofia/ui";

const FONT_FAMILIES = [
  "Helvetica",
  "Arial",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Courier New",
];

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const ColorField = ({ label, value, onChange, disabled = false }) => (
  <div className="mb-4 max-w-xs">
    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={HEX_COLOR_REGEX.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-12 shrink-0 cursor-pointer rounded border border-gray-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="#000000"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      />
    </div>
  </div>
);

// Shared right-hand preview pane used both by a single notification's detail
// screen and by the global email template screen (where `selector` lets the
// admin pick which notification example the template is previewed against).
const EmailPreviewPanel = ({
  t,
  previewHtml,
  isPreviewLoading,
  testEmail,
  setTestEmail,
  isSendingTest,
  onSendTest,
  selector,
}) => {
  const [device, setDevice] = useState("desktop");

  return (
    <div>
      <h4 className="mb-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        {t("EmailPreviewTitle")}
      </h4>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        {t("EmailPreviewDesc")}
      </p>

      {selector && <div className="mb-3">{selector}</div>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => setDevice("desktop")}
          title={t("EmailPreviewDesktop")}
          className={`rounded-md border p-2 ${
            device === "desktop"
              ? "border-emerald-500 text-emerald-600"
              : "border-gray-300 text-gray-500 dark:border-gray-600"
          }`}
        >
          <FiMonitor className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={() => setDevice("mobile")}
          title={t("EmailPreviewMobile")}
          className={`rounded-md border p-2 ${
            device === "mobile"
              ? "border-emerald-500 text-emerald-600"
              : "border-gray-300 text-gray-500 dark:border-gray-600"
          }`}
        >
          <FiSmartphone className="h-4 w-4" />
        </Button>

        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder={t("EmailTestEmailPlaceholder")}
          className="min-w-[180px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
        <Button
          type="button"
          onClick={onSendTest}
          disabled={isSendingTest}
          className="flex items-center gap-1 whitespace-nowrap rounded-md border border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500 dark:text-indigo-400"
        >
          <FiSend className="h-4 w-4" />
          {isSendingTest ? t("Processing") : t("EmailSendTest")}
        </Button>
      </div>

      <div className="mx-auto rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
        {isPreviewLoading && !previewHtml ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("EmailNotificationsLoading")}
          </div>
        ) : (
          <iframe
            title="email-preview"
            srcDoc={previewHtml}
            className="mx-auto h-[520px] rounded border-0 bg-white transition-all"
            style={{ width: device === "mobile" ? "375px" : "100%" }}
          />
        )}
      </div>
    </div>
  );
};

const NotificationList = ({
  t,
  notifications,
  isLoading,
  togglingKey,
  toggleNotification,
  openConfig,
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t("EmailNotificationsTitle")}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("EmailNotificationsDesc")}
      </p>
    </div>

    {isLoading ? (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("EmailNotificationsLoading")}
      </div>
    ) : (
      <div className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
        <div className="hidden gap-4 bg-gray-50 p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400 sm:grid sm:grid-cols-12">
          <div className="sm:col-span-2">{t("EmailStatus")}</div>
          <div className="sm:col-span-4">{t("EmailColumn")}</div>
          <div className="sm:col-span-2">{t("EmailContentType")}</div>
          <div className="sm:col-span-3">{t("EmailRecipients")}</div>
          <div className="sm:col-span-1" />
        </div>

        {notifications.map((notification) => {
          const { title, description } = getEmailNotificationDisplayText(
            notification,
            t
          );
          const recipientLabel =
            notification.recipientType === "customer"
              ? t("EmailRecipientCustomer")
              : notification.recipients?.trim()
              ? notification.recipients
              : t("EmailRecipientAdmin");

          return (
            <div
              key={notification.key}
              className="grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-12 sm:gap-4"
            >
              <div className="sm:col-span-2">
                <CStatusSwitch
                  checked={!!notification.enabled}
                  disabled={togglingKey === notification.key}
                  onChange={(enabled) =>
                    toggleNotification(notification.key, enabled)
                  }
                />
              </div>

              <div className="sm:col-span-4">
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {title}
                </div>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {description}
                </p>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-300 sm:col-span-2">
                text/{notification.contentType}
              </div>

              <div className="break-all text-sm text-gray-600 dark:text-gray-300 sm:col-span-3">
                {recipientLabel}
              </div>

              <div className="sm:col-span-1 sm:text-right">
                <Button
                  type="button"
                  onClick={() => openConfig(notification.key)}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
                >
                  {t("ManageBtn")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const EmailSenderOptionsSection = ({
  t,
  template,
  isTemplateLoading,
  isSavingTemplate,
  saveTemplate,
}) => {
  const [draft, setDraft] = useState({
    fromName: "",
    fromEmail: "",
    emailInsightsEnabled: true,
  });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!template) return;
    setDraft({
      fromName: template.fromName || "",
      fromEmail: template.fromEmail || "",
      emailInsightsEnabled: template.emailInsightsEnabled !== false,
    });
  }, [template]);

  const handleConfirmSave = async () => {
    await saveTemplate(draft);
    setIsConfirmOpen(false);
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("EmailSenderOptionsTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("EmailSenderOptionsDesc")}
        </p>
      </div>

      {isTemplateLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("EmailNotificationsLoading")}
        </div>
      ) : (
        <>
          <div className="mb-4 max-w-md">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailFromName")}
            </label>
            <input
              type="text"
              value={draft.fromName}
              onChange={(e) =>
                setDraft({ ...draft, fromName: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="mb-4 max-w-md">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailFromAddress")}
            </label>
            <input
              type="email"
              value={draft.fromEmail}
              onChange={(e) =>
                setDraft({ ...draft, fromEmail: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-start gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={draft.emailInsightsEnabled}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    emailInsightsEnabled: e.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              {t("EmailInsightsLabel")}
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("EmailInsightsDesc1")}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("EmailInsightsDesc2")}
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isSavingTemplate}
              className="min-w-[160px] rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingTemplate ? t("Processing") : t("SaveBtn")}
            </Button>
          </div>
        </>
      )}

      <SaveSettingsModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={isSavingTemplate}
      />
    </div>
  );
};

const EmailTemplateSection = ({
  t,
  notifications,
  template,
  isTemplateLoading,
  isSavingTemplate,
  saveTemplate,
  previewHtml,
  isPreviewLoading,
  fetchPreview,
  testEmail,
  setTestEmail,
  isSendingTest,
  sendTestEmail,
}) => {
  const [draft, setDraft] = useState({
    logo: "",
    logoWidth: 120,
    headerAlignment: "left",
    fontFamily: "Helvetica",
    footerText: "",
    baseColor: "#720eec",
    backgroundColor: "#f7f7f7",
    bodyBackgroundColor: "#ffffff",
    bodyTextColor: "#3c3c3c",
    secondaryTextColor: "#6b7280",
    syncWithTheme: true,
  });
  const [previewKey, setPreviewKey] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!template) return;
    setDraft({
      logo: template.logo || "",
      logoWidth: template.logoWidth || 120,
      headerAlignment: template.headerAlignment || "left",
      fontFamily: template.fontFamily || "Helvetica",
      footerText: template.footerText || "",
      baseColor: template.baseColor || "#720eec",
      backgroundColor: template.backgroundColor || "#f7f7f7",
      bodyBackgroundColor: template.bodyBackgroundColor || "#ffffff",
      bodyTextColor: template.bodyTextColor || "#3c3c3c",
      secondaryTextColor: template.secondaryTextColor || "#6b7280",
      syncWithTheme: template.syncWithTheme !== false,
    });
  }, [template]);

  useEffect(() => {
    if (previewKey || notifications.length === 0) return;
    const defaultNotification =
      notifications.find((n) => n.key === "processing_order") ||
      notifications[0];
    setPreviewKey(defaultNotification.key);
  }, [notifications, previewKey]);

  const debounceRef = useRef(null);
  useEffect(() => {
    if (!previewKey) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview(previewKey, { templateOverride: draft });
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    previewKey,
    draft.logo,
    draft.logoWidth,
    draft.headerAlignment,
    draft.fontFamily,
    draft.footerText,
    draft.baseColor,
    draft.backgroundColor,
    draft.bodyBackgroundColor,
    draft.bodyTextColor,
    draft.secondaryTextColor,
    draft.syncWithTheme,
  ]);

  const handleSendTest = () =>
    sendTestEmail(previewKey, { templateOverride: draft });

  const handleConfirmSave = async () => {
    await saveTemplate(draft);
    setIsConfirmOpen(false);
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("EmailTemplateTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("EmailTemplateDesc")}
        </p>
      </div>

      {isTemplateLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("EmailNotificationsLoading")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: template form */}
          <div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailTemplateLogo")}
              </label>
              <Uploader
                imageUrl={draft.logo}
                setImageUrl={(url) =>
                  setDraft((prev) => ({
                    ...prev,
                    logo: typeof url === "function" ? url(prev.logo) : url,
                  }))
                }
                folder="email-template"
                alt="logo"
                silentSuccess
              />
            </div>

            <div className="mb-4 max-w-xs">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailTemplateLogoWidth")}
              </label>
              <input
                type="number"
                min={1}
                value={draft.logoWidth}
                onChange={(e) =>
                  setDraft({ ...draft, logoWidth: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>

            <div className="mb-4 max-w-xs">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailTemplateHeaderAlignment")}
              </label>
              <select
                value={draft.headerAlignment}
                onChange={(e) =>
                  setDraft({ ...draft, headerAlignment: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="left">{t("AlignLeft")}</option>
                <option value="center">{t("AlignCenter")}</option>
                <option value="right">{t("AlignRight")}</option>
              </select>
            </div>

            <div className="mb-4 max-w-xs">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailTemplateFontFamily")}
              </label>
              <select
                value={draft.fontFamily}
                onChange={(e) =>
                  setDraft({ ...draft, fontFamily: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailTemplateFooterText")}
              </label>
              <textarea
                rows={2}
                value={draft.footerText}
                onChange={(e) =>
                  setDraft({ ...draft, footerText: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("EmailTemplateFooterTextHelp")}
              </p>
            </div>

            <h4 className="mb-3 mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("EmailTemplatePaletteTitle")}
            </h4>

            <div className="mb-4 flex items-center gap-3">
              <CStatusSwitch
                checked={draft.syncWithTheme}
                onChange={(checked) =>
                  setDraft({ ...draft, syncWithTheme: checked })
                }
              />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t("EmailTemplateSyncTitle")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("EmailTemplateSyncDesc")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <ColorField
                label={t("EmailTemplateBaseColor")}
                value={draft.baseColor}
                disabled={draft.syncWithTheme}
                onChange={(value) => setDraft({ ...draft, baseColor: value })}
              />
              <ColorField
                label={t("EmailTemplateBackgroundColor")}
                value={draft.backgroundColor}
                disabled={draft.syncWithTheme}
                onChange={(value) =>
                  setDraft({ ...draft, backgroundColor: value })
                }
              />
              <ColorField
                label={t("EmailTemplateBodyBackgroundColor")}
                value={draft.bodyBackgroundColor}
                disabled={draft.syncWithTheme}
                onChange={(value) =>
                  setDraft({ ...draft, bodyBackgroundColor: value })
                }
              />
              <ColorField
                label={t("EmailTemplateBodyTextColor")}
                value={draft.bodyTextColor}
                disabled={draft.syncWithTheme}
                onChange={(value) =>
                  setDraft({ ...draft, bodyTextColor: value })
                }
              />
              <ColorField
                label={t("EmailTemplateSecondaryTextColor")}
                value={draft.secondaryTextColor}
                disabled={draft.syncWithTheme}
                onChange={(value) =>
                  setDraft({ ...draft, secondaryTextColor: value })
                }
              />
            </div>

            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isSavingTemplate}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingTemplate ? t("Processing") : t("SaveBtn")}
              </Button>
            </div>
          </div>

          {/* Right: preview, with a selector to pick which notification example to render */}
          <EmailPreviewPanel
            t={t}
            previewHtml={previewHtml}
            isPreviewLoading={isPreviewLoading}
            testEmail={testEmail}
            setTestEmail={setTestEmail}
            isSendingTest={isSendingTest}
            onSendTest={handleSendTest}
            selector={
              <select
                value={previewKey}
                onChange={(e) => setPreviewKey(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                {notifications.map((notification) => {
                  const { title } = getEmailNotificationDisplayText(
                    notification,
                    t
                  );
                  return (
                    <option key={notification.key} value={notification.key}>
                      {title}
                    </option>
                  );
                })}
              </select>
            }
          />
        </div>
      )}

      <SaveSettingsModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={isSavingTemplate}
      />
    </div>
  );
};

const NotificationDetail = ({
  t,
  notification,
  closeConfig,
  isSavingConfig,
  saveConfig,
  previewHtml,
  isPreviewLoading,
  fetchPreview,
  testEmail,
  setTestEmail,
  isSendingTest,
  sendTestEmail,
}) => {
  const { title } = getEmailNotificationDisplayText(notification, t);

  const [draft, setDraft] = useState({
    enabled: true,
    subject: "",
    heading: "",
    additionalContent: "",
    contentType: "html",
    recipients: "",
    cc: "",
    bcc: "",
  });

  useEffect(() => {
    setDraft({
      enabled: !!notification.enabled,
      subject: notification.subject || "",
      heading: notification.heading || "",
      additionalContent: notification.additionalContent || "",
      contentType: notification.contentType || "html",
      recipients: notification.recipients || "",
      cc: notification.cc || "",
      bcc: notification.bcc || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.key]);

  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPreview(notification.key, draft);
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.subject,
    draft.heading,
    draft.additionalContent,
    draft.contentType,
    draft.recipients,
    draft.cc,
    draft.bcc,
    notification.key,
  ]);

  const handleSave = () => saveConfig(notification.key, draft);
  const handleSendTest = () => sendTestEmail(notification.key, draft);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Button
        type="button"
        onClick={closeConfig}
        className="mb-6 flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-emerald-600 dark:text-gray-300"
      >
        <FiChevronLeft className="h-4 w-4" />
        {title}
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: form */}
        <div>
          <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                setDraft({ ...draft, enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {t("EmailEnableToggleLabel")}
          </label>

          {notification.recipientType === "admin" && (
            <div className="mb-3">
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("EmailRecipients")}
              </label>
              <input
                type="text"
                value={draft.recipients}
                onChange={(e) =>
                  setDraft({ ...draft, recipients: e.target.value })
                }
                placeholder={t("EmailRecipientsPlaceholder")}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("EmailRecipientsHelp")}
              </p>
            </div>
          )}

          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailSubject")}
            </label>
            <input
              type="text"
              value={draft.subject}
              onChange={(e) =>
                setDraft({ ...draft, subject: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailHeading")}
            </label>
            <input
              type="text"
              value={draft.heading}
              onChange={(e) =>
                setDraft({ ...draft, heading: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("EmailPlaceholdersHelp")}
            </p>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailAdditionalContent")}
            </label>
            <textarea
              rows={3}
              value={draft.additionalContent}
              onChange={(e) =>
                setDraft({ ...draft, additionalContent: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("EmailAdditionalContentHelp")}
            </p>
          </div>

          <div className="mb-3 max-w-xs">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailContentType")}
            </label>
            <select
              value={draft.contentType}
              onChange={(e) =>
                setDraft({ ...draft, contentType: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              <option value="html">text/html</option>
              <option value="text">text/plain</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailCc")}
            </label>
            <input
              type="text"
              value={draft.cc}
              onChange={(e) => setDraft({ ...draft, cc: e.target.value })}
              placeholder={t("EmailRecipientsPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("EmailBcc")}
            </label>
            <input
              type="text"
              value={draft.bcc}
              onChange={(e) => setDraft({ ...draft, bcc: e.target.value })}
              placeholder={t("EmailRecipientsPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={closeConfig}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t("CancelBtn")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSavingConfig}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingConfig ? t("Processing") : t("SaveBtn")}
            </Button>
          </div>
        </div>

        {/* Right: preview */}
        <EmailPreviewPanel
          t={t}
          previewHtml={previewHtml}
          isPreviewLoading={isPreviewLoading}
          testEmail={testEmail}
          setTestEmail={setTestEmail}
          isSendingTest={isSendingTest}
          onSendTest={handleSendTest}
        />
      </div>
    </div>
  );
};

const EmailNotificationsSection = ({
  notifications,
  isLoading,
  togglingKey,
  toggleNotification,
  editingKey,
  openConfig,
  closeConfig,
  isSavingConfig,
  saveConfig,
  onOpenSmtpConfig,
  template,
  isTemplateLoading,
  isSavingTemplate,
  saveTemplate,
  previewHtml,
  isPreviewLoading,
  fetchPreview,
  testEmail,
  setTestEmail,
  isSendingTest,
  sendTestEmail,
}) => {
  const { t } = useTranslation();
  const activeNotification = notifications.find((n) => n.key === editingKey);

  if (editingKey && activeNotification) {
    return (
      <NotificationDetail
        t={t}
        notification={activeNotification}
        closeConfig={closeConfig}
        isSavingConfig={isSavingConfig}
        saveConfig={saveConfig}
        previewHtml={previewHtml}
        isPreviewLoading={isPreviewLoading}
        fetchPreview={fetchPreview}
        testEmail={testEmail}
        setTestEmail={setTestEmail}
        isSendingTest={isSendingTest}
        sendTestEmail={sendTestEmail}
      />
    );
  }

  return (
    <>
      {onOpenSmtpConfig && (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            onClick={onOpenSmtpConfig}
            className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
          >
            {t("EmailSmtpQuickAccess")}
          </Button>
        </div>
      )}

      <NotificationList
        t={t}
        notifications={notifications}
        isLoading={isLoading}
        togglingKey={togglingKey}
        toggleNotification={toggleNotification}
        openConfig={openConfig}
      />

      <EmailSenderOptionsSection
        t={t}
        template={template}
        isTemplateLoading={isTemplateLoading}
        isSavingTemplate={isSavingTemplate}
        saveTemplate={saveTemplate}
      />

      <EmailTemplateSection
        t={t}
        notifications={notifications}
        template={template}
        isTemplateLoading={isTemplateLoading}
        isSavingTemplate={isSavingTemplate}
        saveTemplate={saveTemplate}
        previewHtml={previewHtml}
        isPreviewLoading={isPreviewLoading}
        fetchPreview={fetchPreview}
        testEmail={testEmail}
        setTestEmail={setTestEmail}
        isSendingTest={isSendingTest}
        sendTestEmail={sendTestEmail}
      />
    </>
  );
};

export default EmailNotificationsSection;
