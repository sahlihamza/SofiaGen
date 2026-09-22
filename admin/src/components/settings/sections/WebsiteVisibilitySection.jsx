import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff, FiChevronLeft, FiTrash2, FiPlus } from "react-icons/fi";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import Uploader from "@/components/image-uploader/Uploader";
import { Button } from "@sofia/ui";

const MODES = [
  { key: "public", titleKey: "WebsiteVisibilityModePublicTitle", descKey: "WebsiteVisibilityModePublicDesc" },
  { key: "private", titleKey: "WebsiteVisibilityModePrivateTitle", descKey: "WebsiteVisibilityModePrivateDesc" },
  { key: "password", titleKey: "WebsiteVisibilityModePasswordTitle", descKey: "WebsiteVisibilityModePasswordDesc" },
  { key: "maintenance", titleKey: "WebsiteVisibilityModeMaintenanceTitle", descKey: "WebsiteVisibilityModeMaintenanceDesc" },
  { key: "comingSoon", titleKey: "WebsiteVisibilityModeComingSoonTitle", descKey: "WebsiteVisibilityModeComingSoonDesc" },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

const Card = ({ title, description, children }) => (
  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm first:mt-0 dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    {children}
  </div>
);

const Field = ({ label, help, children }) => (
  <div className="mb-4">
    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
      {label}
    </label>
    {children}
    {help && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p>}
  </div>
);

const Checkbox = ({ label, description, checked, onChange }) => (
  <label className="mb-4 flex items-start gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
    />
    <span>
      {label}
      {description && (
        <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </span>
  </label>
);

// Newline-separated list <-> array. Used for URL exceptions and allowed IPs,
// which are both short free-form lists.
const linesToArray = (value) =>
  value.split("\n").map((line) => line.trim()).filter(Boolean);

const DEFAULT_DRAFT = {
  visibility: "public",
  password: "",
  passwordPage: { welcomeMessage: "", logo: "", image: "" },
  allowSearchEngines: true,
  robotsNoIndex: false,
  maintenance: {
    title: "", description: "", image: "", color: "#720eec",
    contactButtonLabel: "", contactButtonUrl: "", allowAdmins: true, allowedIpsText: "",
  },
  comingSoon: {
    title: "", description: "", logo: "", launchDate: "",
    countdown: true, newsletter: true, backgroundImage: "", socialLinks: [],
  },
  seo: { generateRobots: true, generateSitemap: true },
  exceptionsText: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const WebsiteVisibilitySection = ({
  settings,
  isLoading,
  isSaving,
  saveSettings,
  isResettingSessions,
  resetSessions,
  previewHtml,
  isPreviewLoading,
  previewMode,
  closePreview,
  previewTheme,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const previewFrameRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);

  // Flips the already-loaded preview instantly when the admin toggles
  // light/dark mode, instead of waiting for a refetch from the server.
  const sendPreviewTheme = () => {
    previewFrameRef.current?.contentWindow?.postMessage(
      { type: "sofiagen-preview-theme", theme: previewTheme },
      "*"
    );
  };

  useEffect(() => {
    sendPreviewTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTheme]);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      visibility: settings.visibility || "public",
      password: "",
      passwordPage: {
        welcomeMessage: settings.passwordPage?.welcomeMessage || "",
        logo: settings.passwordPage?.logo || "",
        image: settings.passwordPage?.image || "",
      },
      allowSearchEngines: settings.allowSearchEngines !== false,
      robotsNoIndex: !!settings.robotsNoIndex,
      maintenance: {
        title: settings.maintenance?.title || "",
        description: settings.maintenance?.description || "",
        image: settings.maintenance?.image || "",
        color: settings.maintenance?.color || "#720eec",
        contactButtonLabel: settings.maintenance?.contactButtonLabel || "",
        contactButtonUrl: settings.maintenance?.contactButtonUrl || "",
        allowAdmins: settings.maintenance?.allowAdmins !== false,
        allowedIpsText: (settings.maintenance?.allowedIps || []).join("\n"),
      },
      comingSoon: {
        title: settings.comingSoon?.title || "",
        description: settings.comingSoon?.description || "",
        logo: settings.comingSoon?.logo || "",
        launchDate: toDateInput(settings.comingSoon?.launchDate),
        countdown: settings.comingSoon?.countdown !== false,
        newsletter: settings.comingSoon?.newsletter !== false,
        backgroundImage: settings.comingSoon?.backgroundImage || "",
        socialLinks: settings.comingSoon?.socialLinks || [],
      },
      seo: {
        generateRobots: settings.seo?.generateRobots !== false,
        generateSitemap: settings.seo?.generateSitemap !== false,
      },
      exceptionsText: (settings.exceptions || []).join("\n"),
    });
  }, [settings]);

  const setSection = (section, patch) =>
    setDraft((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }));

  const handleConfirmSave = async () => {
    const { allowedIpsText, ...maintenanceRest } = draft.maintenance;
    await saveSettings({
      visibility: draft.visibility,
      // Blank means "keep the current password" â€” the form never round-trips it.
      password: draft.password || undefined,
      passwordPage: draft.passwordPage,
      allowSearchEngines: draft.allowSearchEngines,
      robotsNoIndex: draft.robotsNoIndex,
      maintenance: { ...maintenanceRest, allowedIps: linesToArray(allowedIpsText) },
      comingSoon: {
        ...draft.comingSoon,
        launchDate: draft.comingSoon.launchDate || null,
        socialLinks: draft.comingSoon.socialLinks.filter((link) => link.url),
      },
      seo: draft.seo,
      exceptions: linesToArray(draft.exceptionsText),
    });
    setIsConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        {t("AccountsPrivacyLoading")}
      </div>
    );
  }

  // Story 9 â€” preview replaces this section in place (same pattern as the
  // email notification "Manage" detail screen) instead of a floating dialog.
  if (previewHtml) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Button
          type="button"
          onClick={closePreview}
          className="mb-6 flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-emerald-600 dark:text-gray-300"
        >
          <FiChevronLeft className="h-4 w-4" />
          {t("WebsiteVisibilityPreviewTitle")}
        </Button>
        <iframe
          ref={previewFrameRef}
          title="visibility-preview"
          srcDoc={previewHtml}
          sandbox="allow-scripts"
          onLoad={sendPreviewTheme}
          className="h-[75vh] w-full rounded-md border border-gray-200 bg-white dark:border-gray-700"
        />
      </div>
    );
  }

  return (
    <>
      {/* Story 1 â€” mode selector */}
      <Card title={t("WebsiteVisibilityTitle")} description={t("WebsiteVisibilityDesc")}>
        <div className="space-y-3">
          {MODES.map((mode) => (
            <label
              key={mode.key}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                draft.visibility === mode.key
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <input
                type="radio"
                name="website-visibility-mode"
                checked={draft.visibility === mode.key}
                onChange={() => setDraft({ ...draft, visibility: mode.key })}
                className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {t(mode.titleKey)}
                </span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  {t(mode.descKey)}
                </span>
              </span>
              {/* Story 9 â€” preview any mode without switching to it */}
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  previewMode(mode.key);
                }}
                disabled={isPreviewLoading}
                title={t("WebsiteVisibilityPreviewBtn")}
                className="flex shrink-0 items-center gap-1 rounded-md border border-indigo-300 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-500 dark:text-indigo-400"
              >
                <FiEye className="h-3.5 w-3.5" />
                {t("WebsiteVisibilityPreviewBtn")}
              </Button>
            </label>
          ))}
        </div>
      </Card>

      {/* Story 4 â€” password protected */}
      {draft.visibility === "password" && (
        <Card title={t("WebsiteVisibilityPasswordSectionTitle")}>
          <Field label={t("WebsiteVisibilityPasswordLabel")}>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                placeholder={
                  settings?.hasPassword
                    ? t("WebsiteVisibilityPasswordPlaceholderKeep")
                    : t("WebsiteVisibilityPasswordPlaceholderNew")
                }
                className={`${inputClass} pr-10`}
              />
              <Button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <FiEyeOff className="h-4 w-4" />
                ) : (
                  <FiEye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </Field>

          <Field label={t("WebsiteVisibilityWelcomeMessageLabel")}>
            <textarea
              rows={2}
              value={draft.passwordPage.welcomeMessage}
              onChange={(e) => setSection("passwordPage", { welcomeMessage: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("WebsiteVisibilityLogoLabel")}>
              <Uploader
                imageUrl={draft.passwordPage.logo}
                setImageUrl={(url) =>
                  setSection("passwordPage", {
                    logo: typeof url === "function" ? url(draft.passwordPage.logo) : url,
                  })
                }
                folder="branding"
                silentSuccess
              />
            </Field>
            <Field label={t("WebsiteVisibilityImageLabel")}>
              <Uploader
                imageUrl={draft.passwordPage.image}
                setImageUrl={(url) =>
                  setSection("passwordPage", {
                    image: typeof url === "function" ? url(draft.passwordPage.image) : url,
                  })
                }
                folder="branding"
                silentSuccess
              />
            </Field>
          </div>

          {settings?.hasPassword && (
            <div className="mt-2 flex items-center justify-between rounded-md border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t("WebsiteVisibilityResetSessionsTitle")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("WebsiteVisibilityResetSessionsDesc")}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                disabled={isResettingSessions}
                className="shrink-0 rounded-md border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500 dark:text-red-400"
              >
                {isResettingSessions ? t("Processing") : t("WebsiteVisibilityResetSessionsBtn")}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Story 5 â€” maintenance */}
      {draft.visibility === "maintenance" && (
        <Card title={t("WebsiteVisibilityMaintenanceSectionTitle")}>
          <Field label={t("WebsiteVisibilityMaintenanceTitleLabel")}>
            <input
              type="text"
              value={draft.maintenance.title}
              onChange={(e) => setSection("maintenance", { title: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label={t("WebsiteVisibilityMaintenanceDescLabel")}>
            <textarea
              rows={3}
              value={draft.maintenance.description}
              onChange={(e) => setSection("maintenance", { description: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label={t("WebsiteVisibilityIllustrationLabel")}>
            <Uploader
              imageUrl={draft.maintenance.image}
              setImageUrl={(url) =>
                setSection("maintenance", {
                  image: typeof url === "function" ? url(draft.maintenance.image) : url,
                })
              }
              folder="branding"
              silentSuccess
            />
          </Field>

          <Field label={t("WebsiteVisibilityColorLabel")}>
            <div className="flex max-w-xs items-center gap-2">
              <input
                type="color"
                value={/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(draft.maintenance.color) ? draft.maintenance.color : "#720eec"}
                onChange={(e) => setSection("maintenance", { color: e.target.value })}
                className="h-9 w-12 shrink-0 cursor-pointer rounded border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
              />
              <input
                type="text"
                value={draft.maintenance.color}
                onChange={(e) => setSection("maintenance", { color: e.target.value })}
                className={inputClass}
              />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("WebsiteVisibilityContactLabelLabel")}>
              <input
                type="text"
                value={draft.maintenance.contactButtonLabel}
                onChange={(e) => setSection("maintenance", { contactButtonLabel: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label={t("WebsiteVisibilityContactUrlLabel")}>
              <input
                type="text"
                value={draft.maintenance.contactButtonUrl}
                onChange={(e) => setSection("maintenance", { contactButtonUrl: e.target.value })}
                placeholder="mailto:contact@exemple.com"
                className={inputClass}
              />
            </Field>
          </div>

          <Checkbox
            label={t("WebsiteVisibilityAllowAdminsLabel")}
            description={t("WebsiteVisibilityAllowAdminsDesc")}
            checked={draft.maintenance.allowAdmins}
            onChange={(checked) => setSection("maintenance", { allowAdmins: checked })}
          />

          <Field
            label={t("WebsiteVisibilityAllowedIpsLabel")}
            help={t("WebsiteVisibilityAllowedIpsHelp")}
          >
            <textarea
              rows={3}
              value={draft.maintenance.allowedIpsText}
              onChange={(e) => setSection("maintenance", { allowedIpsText: e.target.value })}
              placeholder={"127.0.0.1\n192.168.1.*"}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </Card>
      )}

      {/* Story 6 â€” coming soon */}
      {draft.visibility === "comingSoon" && (
        <Card title={t("WebsiteVisibilityComingSoonSectionTitle")}>
          <Field label={t("WebsiteVisibilityComingSoonTitleLabel")}>
            <input
              type="text"
              value={draft.comingSoon.title}
              onChange={(e) => setSection("comingSoon", { title: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label={t("WebsiteVisibilityComingSoonDescLabel")}>
            <textarea
              rows={3}
              value={draft.comingSoon.description}
              onChange={(e) => setSection("comingSoon", { description: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("WebsiteVisibilityLogoLabel")}>
              <Uploader
                imageUrl={draft.comingSoon.logo}
                setImageUrl={(url) =>
                  setSection("comingSoon", {
                    logo: typeof url === "function" ? url(draft.comingSoon.logo) : url,
                  })
                }
                folder="branding"
                silentSuccess
              />
            </Field>
            <Field label={t("WebsiteVisibilityBackgroundLabel")}>
              <Uploader
                imageUrl={draft.comingSoon.backgroundImage}
                setImageUrl={(url) =>
                  setSection("comingSoon", {
                    backgroundImage:
                      typeof url === "function" ? url(draft.comingSoon.backgroundImage) : url,
                  })
                }
                folder="branding"
                silentSuccess
              />
            </Field>
          </div>

          <Field label={t("WebsiteVisibilityLaunchDateLabel")}>
            <input
              type="date"
              value={draft.comingSoon.launchDate}
              onChange={(e) => setSection("comingSoon", { launchDate: e.target.value })}
              className={`${inputClass} max-w-xs`}
            />
          </Field>

          <Checkbox
            label={t("WebsiteVisibilityCountdownLabel")}
            description={t("WebsiteVisibilityCountdownDesc")}
            checked={draft.comingSoon.countdown}
            onChange={(checked) => setSection("comingSoon", { countdown: checked })}
          />
          <Checkbox
            label={t("WebsiteVisibilityNewsletterLabel")}
            checked={draft.comingSoon.newsletter}
            onChange={(checked) => setSection("comingSoon", { newsletter: checked })}
          />

          <h4 className="mb-3 mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("WebsiteVisibilitySocialLinksTitle")}
          </h4>
          {draft.comingSoon.socialLinks.map((link, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <input
                type="text"
                value={link.label || ""}
                placeholder={t("WebsiteVisibilitySocialLabelPlaceholder")}
                onChange={(e) => {
                  const next = [...draft.comingSoon.socialLinks];
                  next[index] = { ...next[index], label: e.target.value };
                  setSection("comingSoon", { socialLinks: next });
                }}
                className={`${inputClass} sm:max-w-[180px]`}
              />
              <input
                type="text"
                value={link.url || ""}
                placeholder="https://..."
                onChange={(e) => {
                  const next = [...draft.comingSoon.socialLinks];
                  next[index] = { ...next[index], url: e.target.value };
                  setSection("comingSoon", { socialLinks: next });
                }}
                className={inputClass}
              />
              <Button
                type="button"
                onClick={() =>
                  setSection("comingSoon", {
                    socialLinks: draft.comingSoon.socialLinks.filter((_, i) => i !== index),
                  })
                }
                className="shrink-0 rounded-md border border-red-300 px-3 text-red-600 transition hover:bg-red-50 dark:border-red-500 dark:text-red-400"
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() =>
              setSection("comingSoon", {
                socialLinks: [...draft.comingSoon.socialLinks, { label: "", url: "" }],
              })
            }
            className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <FiPlus className="h-4 w-4" />
            {t("WebsiteVisibilityAddSocialLink")}
          </Button>
        </Card>
      )}

      {/* Story 7 â€” SEO */}
      <Card title={t("WebsiteVisibilitySeoTitle")} description={t("WebsiteVisibilitySeoDesc")}>
        <Checkbox
          label={t("WebsiteVisibilityAllowIndexingLabel")}
          description={t("WebsiteVisibilityAllowIndexingDesc")}
          checked={draft.allowSearchEngines}
          onChange={(checked) => setDraft({ ...draft, allowSearchEngines: checked })}
        />
        <Checkbox
          label={t("WebsiteVisibilityNoIndexLabel")}
          description={t("WebsiteVisibilityNoIndexDesc")}
          checked={draft.robotsNoIndex}
          onChange={(checked) => setDraft({ ...draft, robotsNoIndex: checked })}
        />
        <Checkbox
          label={t("WebsiteVisibilityGenerateRobotsLabel")}
          description={t("WebsiteVisibilityGenerateRobotsDesc")}
          checked={draft.seo.generateRobots}
          onChange={(checked) => setSection("seo", { generateRobots: checked })}
        />
        <Checkbox
          label={t("WebsiteVisibilityGenerateSitemapLabel")}
          description={t("WebsiteVisibilityGenerateSitemapDesc")}
          checked={draft.seo.generateSitemap}
          onChange={(checked) => setSection("seo", { generateSitemap: checked })}
        />

        {draft.visibility !== "public" && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
            {t("WebsiteVisibilityNoIndexNotice")}
          </div>
        )}
      </Card>

      {/* Story 8 â€” exceptions */}
      <Card title={t("WebsiteVisibilityExceptionsTitle")} description={t("WebsiteVisibilityExceptionsDesc")}>
        <Field label={t("WebsiteVisibilityExceptionsLabel")} help={t("WebsiteVisibilityExceptionsHelp")}>
          <textarea
            rows={4}
            value={draft.exceptionsText}
            onChange={(e) => setDraft({ ...draft, exceptionsText: e.target.value })}
            placeholder={"/health\n/api/*\n/webhooks/*"}
            className={`${inputClass} font-mono`}
          />
        </Field>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={isSaving}
          className="min-w-[160px] rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("Processing") : t("SaveBtn")}
        </Button>
      </div>

      <SaveSettingsModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={isSaving}
      />

      <ConfirmActionModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={async () => {
          await resetSessions();
          setIsResetConfirmOpen(false);
        }}
        isSubmitting={isResettingSessions}
        title={t("WebsiteVisibilityResetSessionsTitle")}
        message={t("WebsiteVisibilityResetSessionsConfirm")}
        confirmLabel={t("WebsiteVisibilityResetSessionsBtn")}
      />
    </>
  );
};

export default WebsiteVisibilitySection;
