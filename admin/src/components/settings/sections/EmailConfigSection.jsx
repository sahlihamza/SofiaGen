import { useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import InputAreaTwo from "@/components/form/input/InputAreaTwo";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import { Button } from "@sofia/ui";

const EmailConfigSection = ({
  register,
  smtpEnabled,
  setSmtpEnabled,
  smtpSecure,
  setSmtpSecure,
  passwordConfigured,
  onSave,
  isSaving,
  onSendTest,
  isTesting,
}) => {
  const { t } = useTranslation();
  const [testEmail, setTestEmail] = useState("");

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Email Configuration (SMTP)</h3>
            <a
              href="https://sofiagen-documentation.netlify.app/backend-configuration#email-configuration-smtp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500"
            >
              <span>Docs</span>
            </a>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure this store's own email sending. Order confirmations, receipts, and notifications
            go out through it once enabled and configured.
          </p>
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-shrink-0 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? t("Processing") : t("UpdateBtn")}
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <SwitchToggle
          id="smtp_enabled"
          title="Enable this store's own SMTP"
          processOption={smtpEnabled}
          handleProcess={setSmtpEnabled}
        />
      </div>

      {!smtpEnabled && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
          SMTP is off for this store â€” emails will be sent through SofiaGen's own infrastructure instead.
        </div>
      )}

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          SMTP Host
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="SMTP Host" name="email_host" type="text" placeholder="smtp.gmail.com" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          SMTP Port
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="SMTP Port" name="email_port" type="text" placeholder="465" />
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <SwitchToggle
          id="smtp_secure"
          title="Secure connection (TLS)"
          processOption={smtpSecure}
          handleProcess={setSmtpSecure}
        />
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Email User
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo register={register} label="Email User" name="email_user" type="email" placeholder="your@gmail.com" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 items-center sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6">
        <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
          Email Password / App Password
        </label>
        <div className="sm:col-span-3">
          <InputAreaTwo
            register={register}
            label="Email Password"
            name="email_pass"
            type="password"
            placeholder={passwordConfigured ? "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢ (leave blank to keep the current password)" : "App password or SMTP password"}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
        <p className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">Test this configuration</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <Button
            type="button"
            onClick={() => onSendTest(testEmail)}
            disabled={isTesting || !testEmail}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {isTesting ? t("Processing") : "Send test email"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfigSection;
