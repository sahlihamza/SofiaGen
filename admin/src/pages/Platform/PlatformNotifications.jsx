import { Fragment, useState, useEffect } from "react";

import {
  FiBell,
  FiZap,
  FiFileText,
  FiRadio,
  FiSend,
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiClock,
  FiX,
  FiSearch,
  FiShield,
  FiLayers,
} from "react-icons/fi";
import PageTitle from "@/components/Typography/PageTitle";
import { Card, CardBody, Input, Badge } from "@windmill/react-ui";
import SortableDataTable from "@/components/tables/SortableDataTable";
import { notifySuccess, notifyError } from "@/utils/toast";
import requests from "@/services/httpService";
import { CButton, IconButton } from "@/components/ui";


const LOCALES = ["fr", "en", "ar"];
const CHANNEL_KEYS = ["in_app", "email", "push"];

const emptyCreateDraft = () => ({
  code: "",
  name: "",
  description: "",
  category: "",
  priority: "normal",
  channels: { in_app: true, email: false, push: false },
  title: { fr: "", en: "", ar: "" },
  message: { fr: "", en: "", ar: "" },
});

const hasLocaleContent = (value) => LOCALES.some((locale) => (value?.[locale] || "").trim().length > 0);

const CHANNEL_FIELDS = {
  in_app: [],
  email: [
    ["smtpHost", "SmtpHost", "text"],
    ["smtpPort", "SmtpPort", "number"],
    ["smtpUser", "SmtpUser", "text"],
    ["smtpPass", "SmtpPassword", "password"],
    ["fromEmail", "FromEmail", "text"],
    ["fromName", "FromName", "text"],
    ["secure", "UseTlsSsl", "checkbox"],
  ],
  push: [
    ["firebaseServerKey", "FcmServerKey", "password"],
    ["firebaseProjectId", "FirebaseProjectId", "text"],
  ],
  sms: [
    ["provider", "ProviderTwilio", "text"],
    ["accountSid", "AccountSid", "text"],
    ["authToken", "AuthToken", "password"],
    ["fromNumber", "FromNumber", "text"],
  ],
  whatsapp: [
    ["businessAccountId", "WabaBusinessId", "text"],
    ["phoneNumberId", "PhoneNumberId", "text"],
    ["accessToken", "AccessToken", "password"],
  ],
};

const CHANNEL_STATUS_BADGE = { active: "success", configured: "warning", disabled: "neutral" };

const PlatformNotifications = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    totalNotifications: 0,
    pendingDeliveries: 0,
    sentDeliveries: 0,
    failedDeliveries: 0,
    totalTemplates: 0,
  });
  const [events, setEvents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [channels, setChannels] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateDraft());
  const [channelDrawer, setChannelDrawer] = useState(null);
  const [channelFormStatus, setChannelFormStatus] = useState("disabled");
  const [channelFormConfig, setChannelFormConfig] = useState({});
  const [savingChannel, setSavingChannel] = useState(false);

  const handleChannelFieldChange = (key, fieldType, event) => {
    const value = fieldType === "checkbox" ? event.target.checked : event.target.value;
    setChannelFormConfig((current) => ({ ...current, [key]: value }));
  };

  const canCreate =
    createForm.code.trim() !== "" &&
    createForm.name.trim() !== "" &&
    createForm.category.trim() !== "" &&
    hasLocaleContent(createForm.title) &&
    hasLocaleContent(createForm.message);

  const handleCreateTemplate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      await requests.post("/v1/platform/notifications/templates", {
        code: createForm.code.trim().toLowerCase(),
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        category: createForm.category.trim().toLowerCase(),
        priority: createForm.priority,
        enabled: true,
        channels: createForm.channels,
        title: createForm.title,
        message: createForm.message,
      });
      notifySuccess(t("NotificationTemplateCreated", { code: createForm.code.trim().toLowerCase() }));
      setShowCreateModal(false);
      fetchTemplates();
      fetchOverview();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || t("UnableToCreateTemplate"));
    } finally {
      setCreating(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications");
      if (data.success) setOverview(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications/events");
      if (data.success) setEvents(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications/templates", { limit: 100 });
      if (data.success) setTemplates(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChannels = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications/channels");
      if (data.success) setChannels(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeliveries = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications/deliveries");
      if (data.success) setDeliveries(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await requests.get("/v1/platform/notifications/analytics");
      if (data.success) setAnalytics(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openChannelDrawer = (channel) => {
    setChannelDrawer(channel);
    setChannelFormStatus(channel.status);
    setChannelFormConfig({});
  };

  const handleSaveChannel = async () => {
    if (!channelDrawer || savingChannel) return;
    setSavingChannel(true);
    try {
      const data = await requests.put(`/v1/platform/notifications/channels/${channelDrawer.id}`, {
        status: channelFormStatus,
        config: channelFormConfig,
      });
      notifySuccess(data.message || t("ChannelUpdated"));
      setChannelDrawer(null);
      fetchChannels();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || t("UnableToUpdateChannel"));
    } finally {
      setSavingChannel(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchEvents(), fetchTemplates(), fetchChannels(), fetchDeliveries(), fetchAnalytics()]).finally(() =>
      setLoading(false)
    );
  };

  useEffect(() => {
    refreshData();
  }, []);

  const filteredEvents = events.filter(
    (e) => e.code.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <PageTitle>Notifications Engine</PageTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("NotificationsEngineDescription")}
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardBody className="flex items-center p-4">
            <div className="p-3 mr-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FiBell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("TotalNotifications")}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{overview.totalNotifications}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardBody className="flex items-center p-4">
            <div className="p-3 mr-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FiCheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("Delivered")}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{overview.sentDeliveries}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardBody className="flex items-center p-4">
            <div className="p-3 mr-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <FiClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("Pending")}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{overview.pendingDeliveries}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardBody className="flex items-center p-4">
            <div className="p-3 mr-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <FiXCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("Failures")}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{overview.failedDeliveries}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <CardBody className="flex items-center p-4">
            <div className="p-3 mr-4 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FiFileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t("Templates")}</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{overview.totalTemplates}</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        {[
          { id: "overview", label: t("NotificationEventsCatalog"), icon: FiZap },
          { id: "templates", label: t("MultilingualTemplates"), icon: FiFileText },
          { id: "channels", label: t("DeliveryChannels"), icon: FiRadio },
          { id: "deliveries", label: t("DeliveryHistory"), icon: FiSend },
          { id: "analytics", label: t("PerformanceMetrics"), icon: FiActivity },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <CButton
              key={tab.id}
              variant={activeTab === tab.id ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </CButton>

          );
        })}
      </div>

      {/* Tab 1: Events Catalogue */}
      {activeTab === "overview" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative w-72">
              <Input
                placeholder={t("SearchNotificationEvents")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!pl-3 !pr-9"
              />
              <FiSearch className="absolute right-[10px] top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
            <Badge type="neutral" className="px-3 py-1 text-sm font-medium">
              {t("RegisteredEvents", { count: filteredEvents.length })}
            </Badge>
          </div>

          <SortableDataTable
            columns={[
              { key: "code", header: "Code Événement", sortable: false },
              { key: "category", header: "Catégorie", sortable: false },
              { key: "scope", header: "Scope", sortable: false },
              { key: "priority", header: "Priorité", sortable: false },
              { key: "permission", header: "Permission Exigée (RBAC)", sortable: false },
              { key: "recipientModel", header: "Modèle Destinataire", sortable: false },
            ]}
            rows={filteredEvents}
            getRowKey={(e) => e.code}
            renderCell={({ row, column }) => {
              switch (column.key) {
                case "code":
                  return <span className="font-semibold text-emerald-600 dark:text-emerald-400">{row.code}</span>;
                case "category":
                  return <Badge type="primary">{row.category}</Badge>;
                case "scope":
                  return (
                    <span className={`px-2 py-1 text-xs rounded-md font-medium ${row.scope === "platform" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                      {row.scope}
                    </span>
                  );
                case "priority":
                  return <Badge type={row.priority === "critical" ? "danger" : row.priority === "high" ? "warning" : "neutral"}>{row.priority}</Badge>;
                case "permission":
                  return (
                    <span className="flex items-center gap-1 text-xs font-mono text-gray-600 dark:text-gray-300">
                      <FiShield className="w-3.5 h-3.5 text-amber-500" />
                      {row.permission || "Aucune (Direct / Recipient ID)"}
                    </span>
                  );
                case "recipientModel":
                  return <span className="text-xs text-gray-500">{row.recipientModel}</span>;
                default:
                  return row[column.key];
              }
            }}
          />
        </div>
      )}

      {/* Tab 2: Templates */}
      {activeTab === "templates" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Templates de Notification</h3>
            <CButton
              icon="plus"
              onClick={() => {
                setCreateForm(emptyCreateDraft());
                setShowCreateModal(true);
              }}
            >
              Créer un Template
            </CButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <Card key={t._id} className="p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-100">{t.name}</h4>
                    <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{t.code}</p>
                  </div>
                  <Badge type={t.enabled ? "success" : "danger"}>{t.enabled ? "Actif" : "Inactif"}</Badge>
                </div>
                <div className="text-xs text-gray-500 mb-3">{t.description || "Aucune description"}</div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 space-y-1 text-xs">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Titre FR:</span> {t.title?.fr || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Message FR:</span> {t.message?.fr || "-"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Channels */}
      {activeTab === "channels" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {channels.map((c) => (
            <Card key={c.id} className="p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{c.name}</h4>
                <Badge type={CHANNEL_STATUS_BADGE[c.status] || "neutral"}>{c.status}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-3">{c.description}</p>
              <p className="text-xs text-gray-400 mb-4">
                {c.updatedAt ? t("ChannelUpdatedAt", { date: new Date(c.updatedAt).toLocaleString() }) : t("NotConfigured")}
                {(c.configSet || {}) && Object.values(c.configSet).some(Boolean) ? ` ${t("SavedParameters")}` : ""}
              </p>
              <div className="flex justify-end">
                <CButton variant="outline" size="sm" className="w-auto" onClick={() => openChannelDrawer(c)}>
                  Configurer
                </CButton>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 4: Deliveries */}
      {activeTab === "deliveries" && (
          <SortableDataTable
            columns={[
              { key: "event", header: "Événement", sortable: false },
              { key: "channel", header: "Canal", sortable: false },
              { key: "recipientId", header: "Destinataire", sortable: false },
              { key: "status", header: "Statut", sortable: false },
              { key: "attempts", header: "Essais", sortable: false },
              { key: "createdAt", header: "Date", sortable: false },
            ]}
            rows={deliveries}
            getRowKey={(d) => d._id}
            renderCell={({ row, column }) => {
              switch (column.key) {
                case "event":
                  return <span className="font-semibold">{row.notificationId?.event || "N/A"}</span>;
                case "channel":
                  return <Badge type="primary">{row.channel}</Badge>;
                case "recipientId":
                  return <span className="text-xs">{row.recipientId?.email || row.recipientId?.name || String(row.recipientId)}</span>;
                case "status":
                  return <Badge type={row.status === "sent" ? "success" : row.status === "failed" ? "danger" : "warning"}>{row.status}</Badge>;
                case "attempts":
                  return <span className="text-xs">{row.attempts}</span>;
                case "createdAt":
                  return <span className="text-xs text-gray-500">{new Date(row.createdAt).toLocaleString("fr-FR")}</span>;
                default:
                  return row[column.key];
              }
            }}
          />
      )}

      {/* Tab 5: Analytics */}
      {activeTab === "analytics" && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{t("OverallSuccessRate")}</h4>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{analytics.successRate}</p>
          </Card>
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{t("SuccessfulDeliveries")}</h4>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{analytics.sentCount}</p>
          </Card>
          <Card className="p-5">
            <h4 className="text-sm font-semibold text-gray-500 uppercase">{t("TotalFailures")}</h4>
            <p className="text-3xl font-extrabold text-rose-600 mt-2">{analytics.failedCount}</p>
          </Card>
        </div>
      )}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${channelDrawer ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => !savingChannel && setChannelDrawer(null)}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-800 ${channelDrawer ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {t("ConfigureChannel", { name: channelDrawer?.name })}
            </h3>
            <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{channelDrawer?.id}</p>
          </div>
          <IconButton
            icon="close"
            onClick={() => setChannelDrawer(null)}
            disabled={savingChannel}
            aria-label="Close drawer"
          />

        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Status")}</label>
            <select value={channelFormStatus} onChange={(e) => setChannelFormStatus(e.target.value)} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
              <option value="active">{t("Active")}</option>
              <option value="configured">{t("Configured")}</option>
              <option value="disabled">{t("Disabled")}</option>
            </select>
          </div>

          {(CHANNEL_FIELDS[channelDrawer?.id] || []).length === 0 ? (
            <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
              {t("NoChannelParameters")}
            </p>
          ) : (
            <div className="space-y-3">
              {CHANNEL_FIELDS[channelDrawer.id].map(([key, label, fieldType]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                    {fieldType === "password" && channelDrawer?.configSet?.[key] ? ` (${t("Saved")})` : ""}
                  </label>
                  <input
                    type={fieldType}
                    checked={Boolean(channelFormConfig[key])}
                    value={channelFormConfig[key] || ""}
                    onChange={(event) => handleChannelFieldChange(key, fieldType, event)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              ))}
              <p className="text-[11px] text-gray-400">{t("SecretsKeepCurrentValueHint")}</p>
            </div>
          )}
        </div>

        <footer className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="flex justify-end gap-2">
            <CButton variant="outline" size="sm" onClick={() => setChannelDrawer(null)} disabled={savingChannel}>Cancel</CButton>
            <CButton size="sm" loading={savingChannel} onClick={handleSaveChannel} disabled={savingChannel} className="w-auto">
              {savingChannel ? "Saving..." : "Enregistrer"}
            </CButton>
          </div>
        </footer>
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${showCreateModal ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => !creating && setShowCreateModal(false)}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-800 ${showCreateModal ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("CreateNotificationTemplate")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("LocaleRequiredForTemplate")}</p>
          </div>
          <IconButton
            icon="close"
            onClick={() => setShowCreateModal(false)}
            disabled={creating}
            aria-label="Close modal"
          />

        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Code")} *</label>
              <input type="text" value={createForm.code} onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))} placeholder="order.shipped" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Name")} *</label>
              <input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Order shipped" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Category")} *</label>
              <input type="text" value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))} placeholder="orders" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Priority")}</label>
              <select value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                {["low", "normal", "high", "critical"].map((priorityOption) => (
                  <option key={priorityOption} value={priorityOption}>{priorityOption}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Description")}</label>
            <input type="text" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white" />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t("Channels")}</label>
            <div className="flex gap-4">
              {CHANNEL_KEYS.map((channelKey) => (
                <label key={channelKey} className="flex cursor-pointer items-center gap-1.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={createForm.channels[channelKey]} onChange={() => setCreateForm((f) => ({ ...f, channels: { ...f.channels, [channelKey]: !f.channels[channelKey] } }))} className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  {channelKey}
                </label>
              ))}
            </div>
          </div>

          {LOCALES.map((locale) => (
            <div key={locale} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{locale}</span>
                <span className="text-[10px] text-gray-400">{locale === "ar" ? "RTL" : "LTR"}</span>
              </div>
              <input
                type="text"
                dir={locale === "ar" ? "rtl" : "ltr"}
                placeholder="Title&"
                value={createForm.title[locale]}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: { ...f.title, [locale]: e.target.value } }))}
                className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
              <textarea
                rows={2}
                dir={locale === "ar" ? "rtl" : "ltr"}
                placeholder={"Message& (variables {{var}})"}
                value={createForm.message[locale]}
                onChange={(e) => setCreateForm((f) => ({ ...f, message: { ...f.message, [locale]: e.target.value } }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          ))}
        </div>

        <footer className="border-t border-gray-200 p-4 dark:border-gray-700">
          {!canCreate && (
            <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">{t("TemplateFieldsRequired")}</p>
          )}
          <div className="flex justify-end gap-2">
            <CButton variant="outline" size="sm" onClick={() => setShowCreateModal(false)} disabled={creating}>Cancel</CButton>
            <CButton size="sm" loading={creating} onClick={handleCreateTemplate} disabled={creating || !canCreate} className="w-auto">
              {creating ? "Creating..." : "Create template"}
            </CButton>
          </div>
        </footer>
      </aside>
    </div>
  );
};

export default PlatformNotifications;
