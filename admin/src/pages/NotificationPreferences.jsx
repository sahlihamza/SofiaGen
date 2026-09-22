import { Card, CardBody } from "@windmill/react-ui";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import PageTitle from "@/components/Typography/PageTitle";
import { notifyError, notifySuccess } from "@/utils/toast";
import NotificationPreferenceService from "@/services/notificationPreferenceService";
import { Button } from "@sofia/ui";

const CATEGORY_KEYS = [
  { key: "orders", labelKey: "NotifCategoryOrders" },
  { key: "payments", labelKey: "NotifCategoryPayments" },
  { key: "inventory", labelKey: "NotifCategoryInventory" },
  { key: "subscriptions", labelKey: "NotifCategorySubscriptions" },
  { key: "invoices", labelKey: "NotifCategoryInvoices" },
  { key: "users", labelKey: "NotifCategoryUsers" },
  { key: "security", labelKey: "NotifCategorySecurity" },
  { key: "store", labelKey: "NotifCategoryStore" },
  { key: "system", labelKey: "NotifCategorySystem" },
  { key: "customers", labelKey: "NotifCategoryCustomers" },
  { key: "reviews", labelKey: "NotifCategoryReviews" },
  { key: "tickets", labelKey: "NotifCategoryTickets" },
];

const CHANNEL_KEYS = [
  { key: "in_app", labelKey: "NotifChannelInApp" },
  { key: "email", labelKey: "NotifChannelEmail" },
  { key: "push", labelKey: "NotifChannelPush" },
];

const CRITICAL_CATEGORIES = ["security"];

const defaultChannelState = () => ({ in_app: true, email: true, push: false });

const NotificationPreferences = () => {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await NotificationPreferenceService.getPreferences();
        const loaded = { ...res?.preferences };
        for (const cat of CATEGORY_KEYS) {
          if (!loaded[cat.key]) loaded[cat.key] = defaultChannelState();
        }
        setPreferences(loaded);
      } catch (err) {
        notifyError(err?.response?.data?.message || err?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (category, channel) => {
    if (CRITICAL_CATEGORIES.includes(category) && (channel === "in_app" || channel === "email")) {
      return;
    }
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...defaultChannelState(),
        ...prev[category],
        [channel]: !prev[category]?.[channel],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await NotificationPreferenceService.updatePreferences(preferences);
      notifySuccess(t("PreferencesSaved", "Notification preferences saved"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <PageTitle>{t("NotificationPreferencesTitle", "Notification Preferences")}</PageTitle>

      <Card className="shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-300">
                  <th className="py-2">{t("NotifCategoryHeader", "Category")}</th>
                  {CHANNEL_KEYS.map((c) => (
                    <th key={c.key} className="py-2 text-center">
                      {t(c.labelKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORY_KEYS.map((cat) => (
                  <tr key={cat.key} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium text-gray-600 dark:text-gray-300">
                      {t(cat.labelKey)}
                      {CRITICAL_CATEGORIES.includes(cat.key) && (
                        <span className="ml-2 text-xs text-red-500">
                          ({t("NotifAlwaysOn", "always on")})
                        </span>
                      )}
                    </td>
                    {CHANNEL_KEYS.map((channel) => {
                      const checked = preferences[cat.key]?.[channel.key] ?? true;
                      const locked =
                        CRITICAL_CATEGORIES.includes(cat.key) &&
                        (channel.key === "in_app" || channel.key === "email");
                      return (
                        <td key={channel.key} className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggle(cat.key, channel.key)}
                            className="rounded"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Button disabled={saving} onClick={handleSave} className="bg-emerald-500 text-white">
              {saving ? t("Loading", "Saving...") : t("SavePreferences", "Save preferences")}
            </Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default NotificationPreferences;
