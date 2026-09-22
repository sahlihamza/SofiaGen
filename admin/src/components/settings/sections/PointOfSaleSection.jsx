import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import { Button } from "@sofia/ui";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

const Field = ({ label, help, children }) => (
  <div className="mb-6 grid gap-2 md:grid-cols-5 md:items-start sm:grid-cols-12 md:gap-5">
    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 sm:col-span-2">
      {label}
    </label>
    <div className="sm:col-span-3">
      {children}
      {help && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p>}
    </div>
  </div>
);

const DEFAULT_DRAFT = {
  storeName: "",
  physicalAddress: "",
  phone: "",
  email: "",
  refundPolicy: "",
};

const PointOfSaleSection = ({ settings, isLoading, isSaving, saveSettings }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setDraft({
      storeName: settings.storeName || "",
      physicalAddress: settings.physicalAddress || "",
      phone: settings.phone || "",
      email: settings.email || "",
      refundPolicy: settings.refundPolicy || "",
    });
  }, [settings]);

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
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("PointOfSaleStoreDetailsTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("PointOfSaleStoreDetailsDesc")}
          </p>
        </div>

        <Field label={t("PointOfSaleStoreNameLabel")} help={t("PointOfSaleStoreNameHelp")}>
          <input
            type="text"
            value={draft.storeName}
            onChange={(e) => setDraft({ ...draft, storeName: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t("PointOfSaleAddressLabel")}>
          <textarea
            rows={3}
            value={draft.physicalAddress}
            onChange={(e) => setDraft({ ...draft, physicalAddress: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t("PointOfSalePhoneLabel")}>
          <input
            type="text"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t("PointOfSaleEmailLabel")} help={t("PointOfSaleEmailHelp")}>
          <input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t("PointOfSaleRefundPolicyLabel")}>
          <textarea
            rows={4}
            value={draft.refundPolicy}
            onChange={(e) => setDraft({ ...draft, refundPolicy: e.target.value })}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-start">
          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isSaving}
            className="min-w-[160px] rounded-md bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t("Processing") : t("SaveBtn")}
          </Button>
        </div>
      </div>

      <SaveSettingsModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        isSubmitting={isSaving}
      />
    </>
  );
};

export default PointOfSaleSection;
