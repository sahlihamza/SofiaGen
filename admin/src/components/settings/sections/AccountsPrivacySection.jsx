import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pagination, TableFooter } from "@windmill/react-ui";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { Button } from "@sofia/ui";

const REQUIRED_FIELD_OPTIONS = [
  { key: "lastName", labelKey: "AccountsPrivacyFieldLastName" },
  { key: "firstName", labelKey: "AccountsPrivacyFieldFirstName" },
  { key: "phone", labelKey: "AccountsPrivacyFieldPhone" },
  { key: "company", labelKey: "AccountsPrivacyFieldCompany" },
  { key: "address", labelKey: "AccountsPrivacyFieldAddress" },
];

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

const NumberField = ({ label, value, onChange, min = 0 }) => (
  <div className="mb-4 max-w-xs">
    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
      {label}
    </label>
    <input
      type="number"
      min={min}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    />
  </div>
);

// A retention period row: an empty value means "keep indefinitely" (per
// WooCommerce's own convention), so unlike NumberField this allows "".
const RetentionField = ({ label, value, unit, onChangeValue, onChangeUnit, t }) => (
  <div className="mb-4 grid grid-cols-[1fr_auto_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_90px_110px]">
    <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
      {label}
    </label>
    <input
      type="number"
      min={0}
      value={value === null || value === undefined ? "" : value}
      placeholder={t("AccountsPrivacyRetentionUnlimited")}
      onChange={(e) => onChangeValue(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    />
    <select
      value={unit}
      onChange={(e) => onChangeUnit(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
    >
      <option value="days">{t("AccountsPrivacyUnitDays")}</option>
      <option value="weeks">{t("AccountsPrivacyUnitWeeks")}</option>
      <option value="months">{t("AccountsPrivacyUnitMonths")}</option>
      <option value="years">{t("AccountsPrivacyUnitYears")}</option>
    </select>
  </div>
);

const Card = ({ title, description, children }) => (
  <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm first:mt-0 dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

const DEFAULT_DRAFT = {
  checkout: { allowGuestCheckout: true, allowLoginAtCheckout: true },
  accountCreation: {
    allowAtCheckout: true,
    allowFromAccountPage: true,
    sendPasswordSetupEmail: true,
    requireEmailVerification: false,
    autoLoginAfterRegistration: true,
    requiredFields: [],
  },
  passwordPolicy: {
    minLength: 8,
    requireSpecialChar: false,
    requireNumber: true,
    requireUppercase: true,
    passwordExpiryDays: 0,
    passwordHistoryCount: 0,
    maxLoginAttempts: 0,
  },
  privacyPolicy: {
    pageUrl: "",
    registrationText: "",
    checkoutText: "",
  },
  dataErasure: {
    deletePersonalDataFromOrders: false,
    removeDownloadAccessOnRequest: false,
    allowBulkPersonalDataRemoval: false,
  },
  dataRetention: {
    inactiveAccounts: { value: null, unit: "months" },
    pendingOrders: { value: null, unit: "days" },
    failedOrders: { value: null, unit: "days" },
    cancelledOrders: { value: null, unit: "days" },
    refundedOrders: { value: null, unit: "months" },
    completedOrders: { value: null, unit: "months" },
  },
};

const RETENTION_ROWS = [
  { key: "inactiveAccounts", labelKey: "AccountsPrivacyRetentionInactiveAccounts" },
  { key: "pendingOrders", labelKey: "AccountsPrivacyRetentionPendingOrders" },
  { key: "failedOrders", labelKey: "AccountsPrivacyRetentionFailedOrders" },
  { key: "cancelledOrders", labelKey: "AccountsPrivacyRetentionCancelledOrders" },
  { key: "refundedOrders", labelKey: "AccountsPrivacyRetentionRefundedOrders" },
  { key: "completedOrders", labelKey: "AccountsPrivacyRetentionCompletedOrders" },
];

const AccountsPrivacySection = ({
  settings,
  isLoading,
  isSaving,
  saveSettings,
  gdprCustomerEmail,
  setGdprCustomerEmail,
  isGdprExporting,
  isGdprDeleting,
  isGdprAnonymizing,
  gdprExportCustomer,
  gdprDeleteCustomer,
  gdprAnonymizeCustomer,
  gdprRequests,
  isLoadingGdprRequests,
  auditLogEntries,
  isLoadingAuditLog,
  auditLogPage,
  setAuditLogPage,
  auditLogTotalResults,
  auditLogResultsPerPage,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [gdprConfirmAction, setGdprConfirmAction] = useState(null); // "delete" | "anonymize" | null

  useEffect(() => {
    if (!settings) return;
    setDraft({
      checkout: { ...DEFAULT_DRAFT.checkout, ...settings.checkout },
      accountCreation: {
        ...DEFAULT_DRAFT.accountCreation,
        ...settings.accountCreation,
      },
      passwordPolicy: {
        ...DEFAULT_DRAFT.passwordPolicy,
        ...settings.passwordPolicy,
      },
      privacyPolicy: {
        ...DEFAULT_DRAFT.privacyPolicy,
        ...settings.privacyPolicy,
      },
      dataErasure: {
        ...DEFAULT_DRAFT.dataErasure,
        ...settings.dataErasure,
      },
      dataRetention: {
        ...DEFAULT_DRAFT.dataRetention,
        ...Object.fromEntries(
          RETENTION_ROWS.map(({ key }) => [
            key,
            {
              ...DEFAULT_DRAFT.dataRetention[key],
              ...settings.dataRetention?.[key],
            },
          ])
        ),
      },
    });
  }, [settings]);

  const toggleRequiredField = (key, checked) => {
    setDraft((prev) => ({
      ...prev,
      accountCreation: {
        ...prev.accountCreation,
        requiredFields: checked
          ? [...prev.accountCreation.requiredFields, key]
          : prev.accountCreation.requiredFields.filter((f) => f !== key),
      },
    }));
  };

  const handleConfirmSave = async () => {
    await saveSettings(draft);
    setIsConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
        {t("AccountsPrivacyLoading")}
      </div>
    );
  }

  return (
    <>
      <Card
        title={t("AccountsPrivacyCheckoutTitle")}
        description={t("AccountsPrivacyCheckoutDesc")}
      >
        <Checkbox
          label={t("AccountsPrivacyAllowGuestLabel")}
          description={t("AccountsPrivacyAllowGuestDesc")}
          checked={draft.checkout.allowGuestCheckout}
          onChange={(checked) =>
            setDraft({
              ...draft,
              checkout: { ...draft.checkout, allowGuestCheckout: checked },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyAllowLoginLabel")}
          description={t("AccountsPrivacyAllowLoginDesc")}
          checked={draft.checkout.allowLoginAtCheckout}
          onChange={(checked) =>
            setDraft({
              ...draft,
              checkout: { ...draft.checkout, allowLoginAtCheckout: checked },
            })
          }
        />
      </Card>

      <Card
        title={t("AccountsPrivacyAccountCreationTitle")}
        description={t("AccountsPrivacyAccountCreationDesc")}
      >
        <Checkbox
          label={t("AccountsPrivacyAllowAtCheckoutLabel")}
          checked={draft.accountCreation.allowAtCheckout}
          onChange={(checked) =>
            setDraft({
              ...draft,
              accountCreation: {
                ...draft.accountCreation,
                allowAtCheckout: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyAllowFromAccountPageLabel")}
          checked={draft.accountCreation.allowFromAccountPage}
          onChange={(checked) =>
            setDraft({
              ...draft,
              accountCreation: {
                ...draft.accountCreation,
                allowFromAccountPage: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacySendPasswordEmailLabel")}
          description={t("AccountsPrivacySendPasswordEmailDesc")}
          checked={draft.accountCreation.sendPasswordSetupEmail}
          onChange={(checked) =>
            setDraft({
              ...draft,
              accountCreation: {
                ...draft.accountCreation,
                sendPasswordSetupEmail: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyRequireEmailVerificationLabel")}
          checked={draft.accountCreation.requireEmailVerification}
          onChange={(checked) =>
            setDraft({
              ...draft,
              accountCreation: {
                ...draft.accountCreation,
                requireEmailVerification: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyAutoLoginLabel")}
          checked={draft.accountCreation.autoLoginAfterRegistration}
          onChange={(checked) =>
            setDraft({
              ...draft,
              accountCreation: {
                ...draft.accountCreation,
                autoLoginAfterRegistration: checked,
              },
            })
          }
        />

        <h4 className="mb-3 mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("AccountsPrivacyRequiredFieldsTitle")}
        </h4>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {REQUIRED_FIELD_OPTIONS.map((field) => (
            <Checkbox
              key={field.key}
              label={t(field.labelKey)}
              checked={draft.accountCreation.requiredFields.includes(field.key)}
              onChange={(checked) => toggleRequiredField(field.key, checked)}
            />
          ))}
        </div>
      </Card>

      <Card title={t("AccountsPrivacyDataErasureTitle")}>
        <Checkbox
          label={t("AccountsPrivacyDeleteOrderDataLabel")}
          description={t("AccountsPrivacyDeleteOrderDataDesc")}
          checked={draft.dataErasure.deletePersonalDataFromOrders}
          onChange={(checked) =>
            setDraft({
              ...draft,
              dataErasure: {
                ...draft.dataErasure,
                deletePersonalDataFromOrders: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyRemoveDownloadAccessLabel")}
          description={t("AccountsPrivacyRemoveDownloadAccessDesc")}
          checked={draft.dataErasure.removeDownloadAccessOnRequest}
          onChange={(checked) =>
            setDraft({
              ...draft,
              dataErasure: {
                ...draft.dataErasure,
                removeDownloadAccessOnRequest: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyAllowBulkRemovalLabel")}
          description={t("AccountsPrivacyAllowBulkRemovalDesc")}
          checked={draft.dataErasure.allowBulkPersonalDataRemoval}
          onChange={(checked) =>
            setDraft({
              ...draft,
              dataErasure: {
                ...draft.dataErasure,
                allowBulkPersonalDataRemoval: checked,
              },
            })
          }
        />
      </Card>

      <Card
        title={t("GdprRequestsTitle")}
        description={t("GdprRequestsDesc")}
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("GdprCustomerEmailLabel")}
            </label>
            <input
              type="email"
              value={gdprCustomerEmail}
              onChange={(e) => setGdprCustomerEmail(e.target.value)}
              placeholder="client@exemple.com"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={gdprExportCustomer}
              disabled={isGdprExporting || !gdprCustomerEmail}
              className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500 dark:text-indigo-400"
            >
              {isGdprExporting ? t("Processing") : t("GdprExportBtn")}
            </Button>
            <Button
              type="button"
              onClick={() => setGdprConfirmAction("anonymize")}
              disabled={isGdprAnonymizing || !gdprCustomerEmail}
              className="rounded-md border border-yellow-400 px-4 py-2 text-sm font-semibold text-yellow-600 transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-yellow-500 dark:text-yellow-400"
            >
              {isGdprAnonymizing ? t("Processing") : t("GdprAnonymizeBtn")}
            </Button>
            <Button
              type="button"
              onClick={() => setGdprConfirmAction("delete")}
              disabled={isGdprDeleting || !gdprCustomerEmail}
              className="rounded-md border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500 dark:text-red-400"
            >
              {isGdprDeleting ? t("Processing") : t("GdprDeleteBtn")}
            </Button>
          </div>
        </div>

        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("GdprHistoryTitle")}
        </h4>
        {isLoadingGdprRequests ? (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("AccountsPrivacyLoading")}
          </div>
        ) : gdprRequests.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("GdprHistoryEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">{t("GdprHistoryType")}</th>
                  <th className="px-4 py-2">{t("GdprHistoryEmail")}</th>
                  <th className="px-4 py-2">{t("GdprHistoryDate")}</th>
                  <th className="px-4 py-2">{t("GdprHistoryStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {gdprRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="px-4 py-2 capitalize">
                      {t(`GdprType_${request.type}`)}
                    </td>
                    <td className="px-4 py-2 break-all">
                      {request.customerEmailSnapshot}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(request.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {t(`GdprStatus_${request.status}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={t("AccountsPrivacyPasswordPolicyTitle")}>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <NumberField
            label={t("AccountsPrivacyMinLengthLabel")}
            min={4}
            value={draft.passwordPolicy.minLength}
            onChange={(value) =>
              setDraft({
                ...draft,
                passwordPolicy: { ...draft.passwordPolicy, minLength: value },
              })
            }
          />
          <NumberField
            label={t("AccountsPrivacyExpiryDaysLabel")}
            value={draft.passwordPolicy.passwordExpiryDays}
            onChange={(value) =>
              setDraft({
                ...draft,
                passwordPolicy: {
                  ...draft.passwordPolicy,
                  passwordExpiryDays: value,
                },
              })
            }
          />
          <NumberField
            label={t("AccountsPrivacyHistoryCountLabel")}
            value={draft.passwordPolicy.passwordHistoryCount}
            onChange={(value) =>
              setDraft({
                ...draft,
                passwordPolicy: {
                  ...draft.passwordPolicy,
                  passwordHistoryCount: value,
                },
              })
            }
          />
          <NumberField
            label={t("AccountsPrivacyMaxAttemptsLabel")}
            value={draft.passwordPolicy.maxLoginAttempts}
            onChange={(value) =>
              setDraft({
                ...draft,
                passwordPolicy: {
                  ...draft.passwordPolicy,
                  maxLoginAttempts: value,
                },
              })
            }
          />
        </div>

        <Checkbox
          label={t("AccountsPrivacyRequireSpecialCharLabel")}
          checked={draft.passwordPolicy.requireSpecialChar}
          onChange={(checked) =>
            setDraft({
              ...draft,
              passwordPolicy: {
                ...draft.passwordPolicy,
                requireSpecialChar: checked,
              },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyRequireNumberLabel")}
          checked={draft.passwordPolicy.requireNumber}
          onChange={(checked) =>
            setDraft({
              ...draft,
              passwordPolicy: { ...draft.passwordPolicy, requireNumber: checked },
            })
          }
        />
        <Checkbox
          label={t("AccountsPrivacyRequireUppercaseLabel")}
          checked={draft.passwordPolicy.requireUppercase}
          onChange={(checked) =>
            setDraft({
              ...draft,
              passwordPolicy: {
                ...draft.passwordPolicy,
                requireUppercase: checked,
              },
            })
          }
        />
      </Card>

      <Card
        title={t("AccountsPrivacyPolicyTitle")}
        description={t("AccountsPrivacyPolicyDesc")}
      >
        <div className="mb-4 max-w-md">
          <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("AccountsPrivacyPageUrlLabel")}
          </label>
          <input
            type="text"
            value={draft.privacyPolicy.pageUrl}
            onChange={(e) =>
              setDraft({
                ...draft,
                privacyPolicy: {
                  ...draft.privacyPolicy,
                  pageUrl: e.target.value,
                },
              })
            }
            placeholder="https://votre-boutique.com/politique-de-confidentialite"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("AccountsPrivacyRegistrationTextLabel")}
          </label>
          <textarea
            rows={3}
            value={draft.privacyPolicy.registrationText}
            onChange={(e) =>
              setDraft({
                ...draft,
                privacyPolicy: {
                  ...draft.privacyPolicy,
                  registrationText: e.target.value,
                },
              })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="mb-2">
          <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("AccountsPrivacyCheckoutTextLabel")}
          </label>
          <textarea
            rows={3}
            value={draft.privacyPolicy.checkoutText}
            onChange={(e) =>
              setDraft({
                ...draft,
                privacyPolicy: {
                  ...draft.privacyPolicy,
                  checkoutText: e.target.value,
                },
              })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("AccountsPrivacyPlaceholdersHelp")}
        </p>
      </Card>

      <Card
        title={t("AccountsPrivacyRetentionTitle")}
        description={t("AccountsPrivacyRetentionDesc")}
      >
        {RETENTION_ROWS.map(({ key, labelKey }) => (
          <RetentionField
            key={key}
            t={t}
            label={t(labelKey)}
            value={draft.dataRetention[key].value}
            unit={draft.dataRetention[key].unit}
            onChangeValue={(value) =>
              setDraft({
                ...draft,
                dataRetention: {
                  ...draft.dataRetention,
                  [key]: { ...draft.dataRetention[key], value },
                },
              })
            }
            onChangeUnit={(unit) =>
              setDraft({
                ...draft,
                dataRetention: {
                  ...draft.dataRetention,
                  [key]: { ...draft.dataRetention[key], unit },
                },
              })
            }
          />
        ))}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("AccountsPrivacyRetentionHelp")}
        </p>
      </Card>

      <Card title={t("AuditLogTitle")} description={t("AuditLogDesc")}>
        {isLoadingAuditLog ? (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("AccountsPrivacyLoading")}
          </div>
        ) : auditLogEntries.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("AuditLogEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">{t("AuditLogDate")}</th>
                  <th className="px-4 py-2">{t("AuditLogAction")}</th>
                  <th className="px-4 py-2">{t("AuditLogSummary")}</th>
                  <th className="px-4 py-2">{t("AuditLogActor")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {t(`AuditLogAction_${entry.action}`)}
                    </td>
                    <td className="px-4 py-2">{entry.summary}</td>
                    <td className="px-4 py-2">
                      {entry.actorNameSnapshot || t("AuditLogSystemActor")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {auditLogTotalResults > 0 && (
          <TableFooter>
            <Pagination
              totalResults={auditLogTotalResults}
              resultsPerPage={auditLogResultsPerPage}
              onChange={setAuditLogPage}
              label="Table navigation"
            />
          </TableFooter>
        )}
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
        isOpen={gdprConfirmAction === "delete"}
        onClose={() => setGdprConfirmAction(null)}
        onConfirm={async () => {
          await gdprDeleteCustomer();
          setGdprConfirmAction(null);
        }}
        isSubmitting={isGdprDeleting}
        title={t("GdprDeleteConfirmTitle")}
        message={t("GdprDeleteConfirmMessage", { email: gdprCustomerEmail })}
        confirmLabel={t("GdprDeleteBtn")}
      />

      <ConfirmActionModal
        isOpen={gdprConfirmAction === "anonymize"}
        onClose={() => setGdprConfirmAction(null)}
        onConfirm={async () => {
          await gdprAnonymizeCustomer();
          setGdprConfirmAction(null);
        }}
        isSubmitting={isGdprAnonymizing}
        title={t("GdprAnonymizeConfirmTitle")}
        message={t("GdprAnonymizeConfirmMessage", { email: gdprCustomerEmail })}
        confirmLabel={t("GdprAnonymizeBtn")}
      />
    </>
  );
};

export default AccountsPrivacySection;
