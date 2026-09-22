import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";

//internal import
import CStatusSwitch from "@/components/ui/CStatusSwitch";
import {
  getPaymentMethodConfigFields,
  getPaymentMethodDisplayText,
} from "@/utils/paymentMethods";
import PaymentMethodRow from "./PaymentMethodRow";
import { Button } from "@sofia/ui";

const PaymentSettingsSection = ({
  methods,
  isLoading,
  togglingKey,
  isReordering,
  toggleMethod,
  reorderMethodsLocally,
  persistMethodOrder,
  editingKey,
  openConfig,
  closeConfig,
  isSavingConfig,
  saveConfig,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ title: "", description: "", config: {} });

  const editingMethod = methods.find((m) => m.key === editingKey);
  const configFields = getPaymentMethodConfigFields(editingKey);

  // Seeded when the panel opens, and only then: `methods` is a freshly sorted
  // array on every render of the parent, so following it would reset the form
  // under the admin â€” losing a key being typed â€” each time another method is
  // toggled alongside.
  useEffect(() => {
    if (!editingMethod) return;
    const { title, description } = getPaymentMethodDisplayText(editingMethod, t);
    setDraft({
      title: title || "",
      description: description || "",
      // The whole config is carried into the draft, so saving gives back every
      // key the method had rather than only the ones this form shows.
      config: { ...(editingMethod.config || {}) },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingKey]);

  const setConfigValue = (name, value) =>
    setDraft((previous) => ({
      ...previous,
      config: { ...previous.config, [name]: value },
    }));

  const handleSaveConfig = () => {
    saveConfig(editingKey, {
      title: draft.title,
      description: draft.description,
      // Merged over what is stored rather than replacing it: a credential the
      // form doesn't render must survive an edit of the title.
      config: { ...(editingMethod?.config || {}), ...draft.config },
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("PaymentSettingsTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("PaymentSettingsDesc")}
        </p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("PaymentSettingsLoading")}
        </div>
      ) : (
        <DndProvider backend={HTML5Backend}>
          <div className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {methods.map((method, index) => {
              const { title, description } = getPaymentMethodDisplayText(method, t);
              return (
            <div key={method.key}>
              <PaymentMethodRow
                method={method}
                index={index}
                title={title}
                description={description}
                moveRow={reorderMethodsLocally}
                onDragEnd={persistMethodOrder}
                togglingKey={togglingKey}
                toggleMethod={toggleMethod}
                editingKey={editingKey}
                openConfig={openConfig}
                closeConfig={closeConfig}
                t={t}
              />

              {editingKey === method.key && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="mb-3">
                    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("Title")}
                    </label>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("CustomerDescription")}
                    </label>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("PaymentInstructions")}
                    </label>
                    <textarea
                      rows={3}
                      value={draft.config.instructions || ""}
                      onChange={(e) => setConfigValue("instructions", e.target.value)}
                      placeholder={t("PaymentInstructionsPlaceholder")}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>

                  {configFields.length > 0 && (
                    <div className="mb-4 rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t("PaymentCredentials")}
                      </div>
                      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                        {t("PaymentCredentialsDesc")}
                      </p>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {configFields.map((field) => (
                          <div key={field.name}>
                            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                              {t(`PaymentConfigField_${field.name}`)}
                            </label>
                            <input
                              type={field.secret ? "password" : "text"}
                              autoComplete="off"
                              value={draft.config[field.name] || ""}
                              onChange={(e) =>
                                setConfigValue(field.name, e.target.value)
                              }
                              placeholder={field.envKey}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingConfig ? t("Processing") : t("SaveBtn")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
              );
            })}
          </div>
        </DndProvider>
      )}

      {isReordering && (
        <p className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
          {t("ShippingZoneReordering")}
        </p>
      )}
    </div>
  );
};

export default PaymentSettingsSection;
