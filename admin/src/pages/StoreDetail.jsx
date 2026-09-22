import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Redirect, useHistory, useParams } from "react-router-dom";

import {
  FiActivity,
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDatabase,
  FiFileText,
  FiGlobe,
  FiKey,
  FiLink2,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiPause,
  FiPlay,
  FiRefreshCw,
  FiSave,
  FiSettings,
  FiShield,
  FiTag,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiUserPlus,
  FiUsers,
  FiZap,
} from "react-icons/fi";

import { AdminContext } from "@/context/AdminContext";
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import ImageUploader from "@/components/store/ImageUploader";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import PromptModal from "@/components/modal/PromptModal";
import StoreDetailTabs from "@/components/superadmin/store-details/StoreDetailTabs";
import KpiCard from "@/components/superadmin/store-details/KpiCard";
import StoreServices from "@/services/StoreServices";
import PlanServices from "@/services/PlanServices";
import SubscriptionServices from "@/services/SubscriptionServices";
import UserServices from "@/services/UserServices";
import userAPI from "@/services/api/userAPI";
import paymentAPI from "@/services/api/paymentAPI";
import planAPI from "@/services/api/planAPI";
import { notifySuccess, notifyError } from "@/utils/toast";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { Button } from "@sofia/ui";

const tabs = [
  { id: "overview", label: "Overview", icon: FiActivity },
  { id: "subscription", label: "Subscription", icon: FiCreditCard },
  { id: "owner", label: "Owner", icon: FiUsers },
  { id: "admins", label: "Admins", icon: FiUsers },
  { id: "teams", label: "Teams", icon: FiUsers },
  { id: "billing", label: "Billing", icon: FiCreditCard },
  { id: "usage", label: "Usage", icon: FiBarChart2 },
  { id: "analytics", label: "Analytics", icon: FiBarChart2 },
  { id: "domains", label: "Domains", icon: FiGlobe },
  { id: "api", label: "API", icon: FiKey },
  { id: "webhooks", label: "Webhooks", icon: FiLink2 },
  { id: "backups", label: "Backups", icon: FiDatabase },
  { id: "logs", label: "Logs", icon: FiFileText },
  { id: "audit", label: "Audit", icon: FiShield },
  { id: "security", label: "Security", icon: FiShield },
  { id: "maintenance", label: "Maintenance", icon: FiSettings },
  { id: "settings", label: "Settings", icon: FiSettings },
];

const defaultStore = {
  _id: "",
  name: "",
  slug: "",
  status: "inactive",
  owner: {
    name: "",
    email: "",
    phone: "",
    country: "",
    createdAt: "",
    lastLogin: "",
    status: "inactive",
    twoFactorEnabled: false,
  },
  plan: "basic",
  country: "",
  currency: "USD",
  language: "en",
  timezone: "UTC",
  createdAt: "",
  lastLogin: "",
  lastActivity: "",
  trialEndDate: "",
  renewalDate: "",
  totalOrders: 0,
  totalProducts: 0,
  totalCustomers: 0,
  revenue: 0,
  storageUsed: 0,
  storageLimit: 0,
  apiCallsUsed: 0,
  apiCallsLimit: 0,
  activeAdmins: 0,
  lastDeployment: "",
  logo: "",
  address: "",
  isActive: true,
  slugUrl: "",
  health: "",
  compliance: "",
  quotaRows: [],
  adminList: [],
  invoices: [],
  usageSummary: {},
  analytics: {
    revenueTrend: [],
    conversionRate: "",
    avgOrderValue: "",
    refundRate: "",
    cartAbandonment: "",
  },
  domains: [],
  apiKeys: [],
  webhooks: [],
  backups: [],
  logs: [],
  audit: [],
  security: {
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    suspiciousIPs: 0,
    score: 0,
  },
  maintenance: {
    mode: "",
    cacheStatus: "",
    queueStatus: "",
    lastMaintenanceAction: "",
  },
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat(undefined).format(Number(value));
};

const formatCurrency = (value, currency = "USD") => {
  if (value === null || value === undefined) return "";
  const safeCurrency = typeof currency === "string" && /^[a-zA-Z]{3}$/.test(currency) ? currency.toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: safeCurrency, maximumFractionDigits: 0 }).format(Number(value));
  } catch (e) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
  }
};

const HEALTH_LEVEL_LABELS = {
  ok: "Healthy",
  warning: "Needs attention",
  critical: "Critical",
};

const getMaintenanceLabel = (mode) =>
  mode === true || String(mode).toLowerCase() === "enabled" ? "Enabled" : "Disabled";

const getStatusClasses = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (["active", "paid", "healthy", "valid", "succeeded", "success", "complete"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (["trial", "warning", "pending"].includes(normalized)) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (["suspended", "disabled", "failed", "danger"].includes(normalized)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (["deleted"].includes(normalized)) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
};

const getUsagePercent = (used, limit) => {
  const safeLimit = Number(limit) || 1;
  return Math.min((Number(used) / safeLimit) * 100, 100);
};

const SUBSCRIPTION_STATUS_LABELS = {
  active: "Active",
  trial: "Trial",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  cancelled: "Canceled",
  suspended: "Suspended",
  expired: "Expired",
};

const getSubscriptionStatus = (source) =>
  String(source?.subscription?.status || source?.subscriptionStatus || "").toLowerCase();

const getSubscriptionStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  return SUBSCRIPTION_STATUS_LABELS[normalized] || (normalized ? normalized.replace(/_/g, " ") : "Unknown");
};

const PLAN_CHANGE_STATES = ["active", "trial", "past_due"];
const RENEWABLE_STATES = ["active", "trial"];
const PAUSABLE_EXCLUDED_STATES = ["canceled", "cancelled", "expired"];
const RESUMABLE_STATES = ["canceled", "cancelled", "suspended", "expired"];

const SectionHeader = ({ title, description, action }) => (
  <div className="mb-5 flex flex-col gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

const SummaryGrid = ({ rows }) => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {rows.map((row) => (
      <div key={row.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/70">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{row.label}</p>
          {row.change && <span className="rounded-xl bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{row.change}</span>}
        </div>
        <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{row.value}</p>
      </div>
    ))}
  </div>
);

const SmallStatList = ({ entries }) => (
  <div className="space-y-3">
    {entries.map((entry) => (
      <div key={entry.label} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/60">
        <span className="text-gray-600 dark:text-gray-300">{entry.label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{entry.value}</span>
      </div>
    ))}
  </div>
);

const USAGE_STATE_META = {
  ok: { bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" },
  warning: { bar: "bg-amber-500", pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" },
  critical: { bar: "bg-orange-600", pill: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" },
  blocked: { bar: "bg-red-600", pill: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" },
};

const formatUnitValue = (value, unit) => {
  const formatted = formatNumber(value);
  if (unit === "gb") return `${formatted} GB`;
  if (unit === "mb") return `${formatted} MB`;
  if (unit === "days") return `${formatted} days`;
  return formatted;
};

const granularityShort = (label) => {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [year, month] = label.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: "short" });
  }
  return String(label).slice(5);
};

const UsageMeterRow = ({ row }) => {
  const meta = USAGE_STATE_META[row.state] || USAGE_STATE_META.ok;
  const unlimited = Boolean(row.unlimited) || row.limit === null || row.limit === undefined;
  let percent = null;
  if (!unlimited && Number(row.limit) > 0) {
    percent = Math.min(100, Math.round((Number(row.used) / Number(row.limit)) * 100));
  } else if (unlimited && Number(row.used) > 0) {
    percent = null;
  }
  const width = unlimited ? 100 : percent ?? 0;
  const statusLabel = row.state === "ok" && unlimited ? (row.hasCounter ? "tracked" : "no limit") : row.state;

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{row.label}</h4>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {row.periodStart ? `${formatDate(row.periodStart)}  ${formatDate(row.periodEnd)}` : "No billing period recorded yet"}
            {row.overridden ? "  overridden" : ""}
            {!row.hasCounter ? "  no counter yet" : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${meta.pill}`}>{statusLabel}</span>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`h-full rounded-full transition-all ${unlimited ? "bg-emerald-400/70" : meta.bar}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span>
          {formatUnitValue(row.used, row.unit)} / {unlimited ? "Unlimited" : formatUnitValue(row.limit, row.unit)}
        </span>
        <span className="font-semibold text-gray-900 dark:text-white">{percent === null ? "" : `${percent}%`}</span>
      </div>
    </div>
  );
};

const languageOptions = [
  { value: "en", labelKey: "English" },
  { value: "fr", labelKey: "French" },
  { value: "ar", labelKey: "Arabic" },
  { value: "de", labelKey: "German" },
];

const API_KEY_SCOPES = [
  "products.read",
  "products.write",
  "orders.read",
  "orders.write",
  "customers.read",
  "customers.write",
  "analytics.read",
];

const WEBHOOK_EVENTS = [
  "order.created",
  "order.updated",
  "order.paid",
  "order.cancelled",
  "product.created",
  "product.updated",
  "customer.created",
  "subscription.updated",
  "store.owner_changed",
];

const AUDIT_CRITICAL_ACTIONS = [
  "store.owner_changed",
  "store.suspend",
  "store.deleted",
  "api_key.created",
  "api_key.rotated",
  "webhook.secret",
  "settings.updated",
  "plan.upgrade",
  "plan.downgrade",
  "refund",
  "permission_changed",
];

const currencyOptions = [
  { value: "USD", label: "USD  US Dollar" },
  { value: "EUR", label: "EUR  Euro" },
  { value: "GBP", label: "GBP  British Pound" },
  { value: "MAD", label: "MAD  Moroccan Dirham" },
  { value: "TND", label: "TND  Tunisian Dinar" },
  { value: "DZD", label: "DZD  Algerian Dinar" },
  { value: "EGP", label: "EGP  Egyptian Pound" },
  { value: "SAR", label: "SAR  Saudi Riyal" },
  { value: "AED", label: "AED  UAE Dirham" },
  { value: "CAD", label: "CAD  Canadian Dollar" },
  { value: "AUD", label: "AUD  Australian Dollar" },
];

const planOptions = ["Basic", "Growth", "Pro", "Enterprise", "Custom"];

const timezoneOptions = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Tokyo",
];

const StoreDetail = () => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state || {};
  const { id } = useParams();
  const history = useHistory();

  const [activeTab, setActiveTab] = useState("overview");
  const [store, setStore] = useState(defaultStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [tabData, setTabData] = useState({});
  const [tabLoading, setTabLoading] = useState({});
  const [tabError, setTabError] = useState({});
  const [tabUnavailable, setTabUnavailable] = useState({});
  const [name, setName] = useState(defaultStore.name);
  const [address, setAddress] = useState(defaultStore.address);
  const [currency, setCurrency] = useState(defaultStore.currency);
  const [imageUrl, setImageUrl] = useState(defaultStore.logo);
  const [isActive, setIsActive] = useState(defaultStore.isActive);
  const [language, setLanguage] = useState(defaultStore.language);
  const [taxRate, setTaxRate] = useState(0);
  const [theme, setTheme] = useState("light");
  const [slug, setSlug] = useState(defaultStore.slug);
  const [subdomain, setSubdomain] = useState("");
  const [domain, setDomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [category, setCategory] = useState("");
  const [timezone, setTimezone] = useState(defaultStore.timezone);
  const [plan, setPlan] = useState(defaultStore.plan);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [status, setStatus] = useState(defaultStore.status);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planModalMode, setPlanModalMode] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyForm, setApiKeyForm] = useState({ name: "", scopes: [], expiresInDays: "" });
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: "", events: [] });
  const [deliveriesModal, setDeliveriesModal] = useState(null);
  const [deliveriesData, setDeliveriesData] = useState([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({ action: "", module: "", severity: "", status: "", dateFrom: "", dateTo: "" });
  const [auditDraft, setAuditDraft] = useState({ action: "", module: "", severity: "", status: "", dateFrom: "", dateTo: "" });
  const [auditRows, setAuditRows] = useState([]);
  const [auditPagination, setAuditPagination] = useState(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState("30d");
  const [analyticsCustomFrom, setAnalyticsCustomFrom] = useState("");
  const [analyticsCustomTo, setAnalyticsCustomTo] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [systemLogsService, setSystemLogsService] = useState("all");
  const [systemLogsRows, setSystemLogsRows] = useState([]);
  const [systemLogsLoading, setSystemLogsLoading] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ enabled: false, message: "" });
  const [reviewSettingsForm, setReviewSettingsForm] = useState({
    enabled: false,
    requireApproval: false,
    verifiedOwnersOnly: false,
    allowGuestReviews: false,
    showRating: true,
    showCount: true,
    maxImages: 0,
  });
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [domainForm, setDomainForm] = useState({ domain: "", isPrimary: false });
  const [editingDomainId, setEditingDomainId] = useState(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [pendingPromptAction, setPendingPromptAction] = useState(null);
  const [promptConfig, setPromptConfig] = useState({ title: "", message: "", placeholder: "", defaultValue: "" });
  const [loginHistoryModalOpen, setLoginHistoryModalOpen] = useState(false);
  const [loginHistoryData, setLoginHistoryData] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", phone: "", roleId: "" });
  const [adminRoles, setAdminRoles] = useState([]);
  const [adminRolesLoading, setAdminRolesLoading] = useState(false);
  const [adminModalMode, setAdminModalMode] = useState("create");
  const [adminUserSearch, setAdminUserSearch] = useState("");
  const [adminUserResults, setAdminUserResults] = useState([]);
  const [adminUserSearchLoading, setAdminUserSearchLoading] = useState(false);
  const [selectedExistingUser, setSelectedExistingUser] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferResults, setTransferResults] = useState([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);
  const [billingFilter, setBillingFilter] = useState("all");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [openPaymentRow, setOpenPaymentRow] = useState(null);

  const fetchStore = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError("");
        }
        const response = await StoreServices.getStoreById(id);
        const storeData = { ...defaultStore, ...response, owner: { ...defaultStore.owner, ...(response?.owner || {}) } };
        if (!Array.isArray(storeData.quotaRows) || storeData.quotaRows.length === 0) {
          storeData.quotaRows = defaultStore.quotaRows;
        }

        storeData.slugUrl = response.customDomain ? `https://${response.customDomain}` : `${import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000"}/storefront/${id}`;
        storeData.health = HEALTH_LEVEL_LABELS[response.health?.level] || (response.isActive === false ? "Needs attention" : "Healthy");
        storeData.lastLogin = response.owner?.lastLogin || defaultStore.lastLogin;
        if (storeData.category && typeof storeData.category === "object") {
          storeData.category = storeData.category.name || storeData.category.slug || "";
        }
        if (storeData.plan && typeof storeData.plan === "object") {
          storeData.plan = storeData.plan.name || storeData.plan.slug || "";
        }
        if (storeData.status && typeof storeData.status === "object") {
          storeData.status = storeData.status.name || storeData.status.slug || "";
        }

        storeData.renewalDate = response.nextBillingDate || response.currentPeriodEnd || storeData.renewalDate;
        storeData.trialEndDate = response.trialEndsAt || "";
        if (!storeData.owner.name) {
          storeData.owner.name = response.ownerName && response.ownerName !== "N/A" ? response.ownerName : "";
        }

        setStore(storeData);
        setName(storeData.name || "");
        setAddress(storeData.address || "");
        setCurrency(storeData.currency || "USD");
        setImageUrl(storeData.logo || "");
        setIsActive(Boolean(storeData.isActive ?? true));
        setLanguage(storeData.language || "en");
        setTaxRate(storeData.taxRate ?? 0);
        setSlug(storeData.slug || "");
        setSubdomain(storeData.subdomain || "");
        setDomain(storeData.domain || "");
        setCustomDomain(storeData.customDomain || "");
        setCategory(typeof storeData.category === "string" ? storeData.category : (storeData.category?.name || storeData.category?.slug || ""));
        setTimezone(storeData.timezone || "America/New_York");
        setPlan(storeData.plan || "basic");
        setBillingCycle(storeData.billingCycle || "monthly");
        setStatus(storeData.status || "active");
        setReviewSettingsForm((prev) => ({ ...prev, ...(storeData.reviewSettings || {}) }));
      } catch (e) {
        if (!silent) {
          setError(e?.response?.data?.message || e?.message || "Unable to load the store details.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  const getStorePublicUrl = (store) => {
    if (!store) return null;
    if (store.customDomain) {
      return `https://${store.customDomain}/`;
    }
    const baseUrl = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000";
    return `${baseUrl}/storefront/${store._id}`;
  };

  const handleViewStorefront = () => {
    const url = getStorePublicUrl(store);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const fetchTabData = async (tabId) => {
    if (tabData[tabId] || tabLoading[tabId] || tabUnavailable[tabId]) return;
    setTabLoading((prev) => ({ ...prev, [tabId]: true }));
    setTabError((prev) => ({ ...prev, [tabId]: null }));
    try {
      let data;
      switch (tabId) {
        case "api":
          data = await StoreServices.getStoreApiKeys(id);
          break;
        case "webhooks":
          data = await StoreServices.getStoreWebhooks(id);
          break;
        case "backups":
          data = await StoreServices.getStoreBackups(id);
          break;
        case "security":
          data = await StoreServices.getStoreSecurity(id);
          break;
        case "maintenance":
          data = await StoreServices.getStoreMaintenance(id);
          break;
        default:
          return;
      }
      setTabData((prev) => ({ ...prev, [tabId]: data }));
    } catch (e) {
      if (e?.response?.status === 501) {
        setTabUnavailable((prev) => ({ ...prev, [tabId]: true }));
        setTabError((prev) => ({ ...prev, [tabId]: null }));
      } else {
        setTabError((prev) => ({ ...prev, [tabId]: e?.response?.data?.message || e?.message || "Unable to load data." }));
      }
    } finally {
      setTabLoading((prev) => ({ ...prev, [tabId]: false }));
    }
  };

  useEffect(() => {
    const tabsNeedingFetch = ["api", "webhooks", "backups", "security", "maintenance"];
    if (tabsNeedingFetch.includes(activeTab)) {
      fetchTabData(activeTab);
    }
  }, [activeTab, id]);

  const summaryValues = useMemo(
    () => [
      { label: "Revenue", value: formatCurrency(store.revenue, store.currency) },
      { label: "Orders", value: formatNumber(store.totalOrders) },
      { label: "Products", value: formatNumber(store.totalProducts) },
      { label: "Customers", value: formatNumber(store.totalCustomers) },
    ],
    [store]
  );

  const isSuperAdmin = Boolean(adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin");

  const subscriptionStatusValue = getSubscriptionStatus(store);
  const hasSubscription = Boolean(store.currentSubscriptionId || store.subscription?.id);

  const subscriptionActionButtons = useMemo(() => {
    const planChangeAllowed = hasSubscription && PLAN_CHANGE_STATES.includes(subscriptionStatusValue);
    return [
      {
        key: "upgrade",
        label: "Upgrade plan",
        icon: FiTrendingUp,
        primary: true,
        disabled: !planChangeAllowed,
        hint: hasSubscription ? "Only active, trial or past due subscriptions can be changed." : "Attach a subscription to this store first.",
      },
      {
        key: "downgrade",
        label: "Downgrade plan",
        icon: FiTrendingDown,
        disabled: !planChangeAllowed,
        className:
          "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-200",
        hint: hasSubscription ? "Quota overages on the target plan may block the downgrade." : "Attach a subscription to this store first.",
      },
      {
        key: "renew",
        label: "Renew subscription",
        icon: FiRefreshCw,
        disabled: !(hasSubscription && RENEWABLE_STATES.includes(subscriptionStatusValue)),
        className:
          "border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300",
        hint: "Only active or trial subscriptions can be renewed.",
      },
      {
        key: "pause",
        label: "Pause subscription",
        icon: FiPause,
        disabled: !(hasSubscription && !PAUSABLE_EXCLUDED_STATES.includes(subscriptionStatusValue)),
        className:
          "border-gray-300 font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 dark:border-gray-600 dark:text-amber-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-200",
        hint: PAUSABLE_EXCLUDED_STATES.includes(subscriptionStatusValue) ? "This subscription is already paused or has ended." : "",
      },
      {
        key: "resume",
        label: "Resume subscription",
        icon: FiPlay,
        disabled: !(hasSubscription && RESUMABLE_STATES.includes(subscriptionStatusValue)),
        className:
          "border-gray-300 font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 dark:border-gray-600 dark:text-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-200",
        hint: "Only paused, suspended or expired subscriptions can be resumed.",
      },
      {
        key: "coupon",
        label: "Apply coupon",
        icon: FiTag,
        disabled: !hasSubscription,
        className:
          "border-gray-300 text-violet-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-gray-600 dark:text-violet-300 dark:hover:bg-violet-900/20 dark:hover:text-violet-200",
        hint: "Attach a subscription to this store first.",
      },
    ];
  }, [hasSubscription, subscriptionStatusValue]);

  const hasOwner = Boolean(store.owner?._id);
  const ownerStatusValue = String(store.owner?.status || "").toLowerCase();
  const ownerBlocked = ["suspended", "blocked"].includes(ownerStatusValue);

  const ownerActionButtons = useMemo(
    () => [
      {
        key: "change-owner",
        label: "Change owner",
        icon: FiUsers,
        primary: true,
        disabled: !hasOwner,
        hint: "Transfer this store to another user account.",
      },
      {
        key: "login-as-owner",
        label: "Login as owner",
        icon: FiUser,
        disabled: !hasOwner,
        className:
          "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-200",
        hint: "Generate an impersonation token for this account.",
      },
      {
        key: "reset-password",
        label: "Reset password",
        icon: FiKey,
        disabled: !hasOwner,
        className:
          "border-gray-300 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300",
        hint: "Send a password reset email to the owner.",
      },
      {
        key: "resend-invite",
        label: "Resend setup email",
        icon: FiMail,
        disabled: !hasOwner,
        className:
          "border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-200",
        hint: "Resend the original onboarding email.",
      },
      {
        key: "block-user",
        label: ownerBlocked ? "Unblock user" : "Block user",
        icon: ownerBlocked ? FiCheckCircle : FiAlertTriangle,
        disabled: !hasOwner,
        className: ownerBlocked
          ? "border-gray-300 font-medium text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 dark:border-gray-600 dark:text-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-200"
          : "border-gray-300 font-medium text-red-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-gray-600 dark:text-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-200",
        hint: ownerBlocked ? "Restore administration access." : "Revoke the owner's access to this store.",
      },
      {
        key: "revoke-sessions",
        label: "Revoke sessions",
        icon: FiLogOut,
        disabled: !hasOwner,
        className:
          "border-gray-300 font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 dark:border-gray-600 dark:text-amber-300 dark:hover:bg-amber-900/20 dark:hover:text-amber-200",
        hint: "Sign the owner out of every device.",
      },
      {
        key: "view-login-history",
        label: "View login history",
        icon: FiClock,
        disabled: !hasOwner,
        className:
          "border-gray-300 text-violet-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-gray-600 dark:text-violet-300 dark:hover:bg-violet-900/20 dark:hover:text-violet-200",
        hint: "Show recent sign-in attempts for this account.",
      },
    ],
    [hasOwner, ownerBlocked]
  );

  const handlePromptConfirm = (value) => {
    setPromptValue(value);
    setIsPromptOpen(false);
    if (pendingPromptAction) pendingPromptAction(value);
  };

  const handleSaveGeneralGroup = async () => {
    try {
      setIsSubmitting(true);
      const updated = await StoreServices.updateStoreSettings(id, "general", {
        name,
        address,
        logo: imageUrl,
        category,
      });
      notifySuccess("General settings saved");
      setStore((prev) => ({ ...prev, name: updated.name, address: updated.address, logo: updated.logo, category: updated.category }));
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to save general settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAddressesGroup = async () => {
    try {
      setIsSubmitting(true);
      await StoreServices.updateStore(id, { subdomain, domain, customDomain });
      notifySuccess("Web addresses saved");
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to save web addresses");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveReviewsGroup = async () => {
    try {
      setIsSubmitting(true);
      const reviewSettings = {
        enabled: Boolean(reviewSettingsForm.enabled),
        requireApproval: Boolean(reviewSettingsForm.requireApproval),
        verifiedOwnersOnly: Boolean(reviewSettingsForm.verifiedOwnersOnly),
        allowGuestReviews: Boolean(reviewSettingsForm.allowGuestReviews),
        showRating: Boolean(reviewSettingsForm.showRating),
        showCount: Boolean(reviewSettingsForm.showCount),
        maxImages: Math.max(0, Math.floor(Number(reviewSettingsForm.maxImages) || 0)),
      };
      await StoreServices.updateStoreSettings(id, "reviews", { reviewSettings });
      notifySuccess("Review settings saved");
      setStore((prev) => ({ ...prev, reviewSettings }));
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to save review settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginAs = async () => {
    try {
      setIsSubmitting(true);
      const ownerId = store.owner?._id || store.owner;
      if (!ownerId) {
        notifyError("Store owner not found");
        return;
      }
      await StoreServices.impersonateStoreOwner(ownerId);
      notifySuccess(`Impersonation token generated for ${store.owner?.name || "store owner"}`);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to impersonate store owner");
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshBackupsTab = () => {
    setTabData((prev) => ({ ...prev, backups: null }));
    setTabUnavailable((prev) => ({ ...prev, backups: false }));
    fetchTabData("backups");
  };

  const handleBackup = async () => {
    try {
      setIsSubmitting(true);
      const job = await StoreServices.createStoreBackup(id, { type: "manual", retentionDays: 30 });
      notifySuccess(job?.status === "queued" ? "Backup queued  progress will update below" : "Backup created");
      refreshBackupsTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to create backup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeVerifyBackup = async (jobId) => {
    try {
      setIsSubmitting(true);
      const result = await StoreServices.verifyStoreBackup(id, jobId);
      if (result.valid) notifySuccess("Backup verified  checksum matches");
      else notifyError(`Verification failed: ${result.reason || "checksum mismatch"}`);
      setConfirmAction(null);
      refreshBackupsTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to verify backup");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleDownloadBackup = async (jobId) => {
    try {
      setIsSubmitting(true);
      const blob = await StoreServices.downloadStoreBackup(id, jobId);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup-${id}-${String(jobId).slice(-8)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to download backup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRestoreBackup = async (jobId) => {
    try {
      setIsSubmitting(true);
      const result = await StoreServices.restoreStoreBackup(id, jobId);
      notifySuccess(result?.summary ? "Configuration restored from backup" : "Backup restored successfully");
      setConfirmAction(null);
      refreshBackupsTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to restore backup");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeDeleteBackup = async (jobId) => {
    try {
      setIsSubmitting(true);
      await StoreServices.deleteStoreBackup(id, jobId);
      notifySuccess("Backup deleted");
      setConfirmAction(null);
      refreshBackupsTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to delete backup");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const openPlanModal = async (mode) => {
    setPlanModalMode(mode);
    setSelectedPlanId("");
    try {
      setUpgradeLoading(true);
      const plans = await PlanServices.getActivePlans();
      setUpgradePlans(Array.isArray(plans) ? plans : []);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to load plans");
      setUpgradePlans([]);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handlePlanSubmit = async () => {
    const subscriptionId = store.currentSubscriptionId || store.subscription?.id;
    if (!subscriptionId) {
      notifyError("No active subscription found for this store");
      return;
    }
    if (!selectedPlanId) {
      notifyError("Please select a target plan");
      return;
    }
    try {
      setIsSubmitting(true);
      if (planModalMode === "downgrade") {
        await PlanServices.downgradeSubscription(subscriptionId, {
          targetPlanId: selectedPlanId,
          billingCycle: store.billingCycle || "monthly",
        });
        notifySuccess("Subscription downgrade completed successfully");
      } else {
        await PlanServices.upgradeSubscription(subscriptionId, {
          targetPlanId: selectedPlanId,
          billingCycle: store.billingCycle || "monthly",
          isAutoRenew: true,
        });
        notifySuccess("Subscription upgrade completed successfully");
      }
      setPlanModalMode(null);
      setSelectedPlanId("");
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to change subscription plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscriptionAction = async (actionKey) => {
    const subscriptionId = store.currentSubscriptionId || store.subscription?.id;
    if (!subscriptionId) {
      notifyError("No active subscription found for this store");
      return;
    }
    if (actionKey === "upgrade" || actionKey === "downgrade") {
      await openPlanModal(actionKey);
      return;
    }
    if (actionKey === "pause") {
      setConfirmAction({ type: "pause-subscription" });
      return;
    }
    if (actionKey === "coupon") {
      setPromptConfig({ title: "Enter coupon code", message: "", placeholder: "", defaultValue: "" });
      setPendingPromptAction(async (value) => {
        if (!value) return;
        try {
          await SubscriptionServices.applyCouponToSubscription(subscriptionId, value);
          notifySuccess("Coupon applied successfully");
          await fetchStore({ silent: true });
        } catch (e) {
          notifyError(e?.response?.data?.message || "Unable to apply coupon");
        } finally {
          setIsSubmitting(false);
        }
      });
      setIsPromptOpen(true);
      return;
    }
    try {
      setIsSubmitting(true);
      if (actionKey === "renew") {
        await SubscriptionServices.renewSubscription(subscriptionId);
        notifySuccess("Subscription renewed successfully");
      } else if (actionKey === "resume") {
        await SubscriptionServices.resumeSubscription(subscriptionId);
        notifySuccess("Subscription resumed successfully");
      }
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to complete the subscription action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executePauseSubscription = async () => {
    const subscriptionId = store.currentSubscriptionId || store.subscription?.id;
    if (!subscriptionId) {
      notifyError("No active subscription found for this store");
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await SubscriptionServices.cancelSubscription(subscriptionId, { reason: "Paused by admin" });
      notifySuccess("Subscription paused successfully");
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to pause subscription");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleOwnerAction = async (actionKey) => {
    const ownerId = store.owner?._id || store.owner;
    if (!ownerId) {
      notifyError("Store owner not found");
      return;
    }
    if (actionKey === "change-owner") {
      setTransferSearch("");
      setTransferResults([]);
      setSelectedNewOwner(null);
      setShowTransferModal(true);
      return;
    }
    if (actionKey === "login-as-owner") {
      setConfirmAction({
        type: "login-as-owner",
        ownerName: store.owner?.name || store.owner?.email,
      });
      return;
    }
    if (actionKey === "view-login-history") {
      setLoginHistoryModalOpen(true);
      setLoginHistoryLoading(true);
      setLoginHistoryData([]);
      try {
        const response = await UserServices.getUserLoginHistory(ownerId, { limit: 20 });
        const entries = Array.isArray(response) ? response : response?.data || [];
        setLoginHistoryData(entries);
      } catch (e) {
        notifyError(e?.response?.data?.message || "Unable to load login history");
        setLoginHistoryModalOpen(false);
      } finally {
        setLoginHistoryLoading(false);
      }
      return;
    }
    if (actionKey === "block-user") {
      setConfirmAction({ type: ownerBlocked ? "unblock-owner" : "block-owner" });
      return;
    }
    if (actionKey === "revoke-sessions") {
      setConfirmAction({ type: "revoke-owner-sessions" });
      return;
    }
    try {
      setIsSubmitting(true);
      if (actionKey === "reset-password") {
        await UserServices.resetPassword(ownerId, {});
        notifySuccess("Password reset email sent");
      } else if (actionKey === "resend-invite") {
        await UserServices.resendInvitation(ownerId);
        notifySuccess("Setup email resent");
      }
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to complete the owner action");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showTransferModal) return;
    const query = transferSearch.trim();
    if (query.length < 2) {
      setTransferResults([]);
      setTransferLoading(false);
      return;
    }
    setTransferLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await userAPI.getAllUsers({ search: query, limit: 8 });
        const users = Array.isArray(response) ? response : response?.data || [];
        setTransferResults(users.filter((userResult) => String(userResult._id) !== String(store.owner?._id || "")));
      } catch (e) {
        setTransferResults([]);
      } finally {
        setTransferLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [showTransferModal, transferSearch]);

  const handleTransferSubmit = async () => {
    if (!selectedNewOwner) {
      notifyError("Please search and select the new owner");
      return;
    }
    try {
      setIsSubmitting(true);
      if (isSuperAdmin) {
        await StoreServices.platformTransferOwnership(id, selectedNewOwner._id);
      } else {
        await StoreServices.updateStoreOwner(id, selectedNewOwner._id);
      }
      notifySuccess(`Ownership transferred to ${selectedNewOwner.name || selectedNewOwner.email}`);
      setShowTransferModal(false);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to transfer ownership");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeSetOwnerBlock = async (block) => {
    const ownerId = store.owner?._id || store.owner;
    if (!ownerId) {
      notifyError("Store owner not found");
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      if (block) {
        await UserServices.blockUser(ownerId, { reason: "Blocked by admin" });
        notifySuccess("User blocked successfully");
      } else {
        await UserServices.unblockUser(ownerId);
        notifySuccess("User unblocked successfully");
      }
      setConfirmAction(null);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || (block ? "Unable to block user" : "Unable to unblock user"));
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeLoginAsOwner = async () => {
    const ownerId = store.owner?._id || store.owner;
    if (!ownerId) {
      notifyError("Store owner not found");
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await StoreServices.impersonateStoreOwner(ownerId);
      notifySuccess(`Impersonation token generated for ${store.owner?.name || "store owner"}`);
      setConfirmAction(null);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to impersonate store owner");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeRevokeOwnerSessions = async () => {
    const ownerId = store.owner?._id || store.owner;
    if (!ownerId) {
      notifyError("Store owner not found");
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await UserServices.revokeAllSessions(ownerId);
      notifySuccess("All sessions revoked");
      setConfirmAction(null);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to revoke sessions");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleVerifyDomain = async (domainId) => {
    try {
      setIsSubmitting(true);
      const updated = await StoreServices.verifyStoreDomain(id, domainId);
      setStore((prev) => ({
        ...prev,
        domains: (prev.domains || []).map((d) => (d._id === updated._id ? updated : d)),
      }));
      if (updated.verified) {
        notifySuccess(updated.ssl ? "DNS verified and SSL certificate is active" : "DNS verified");
      } else {
        notifyError(updated.lastError || "DNS verification failed  check the domain configuration");
      }
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to verify the domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDomainSubmit = async () => {
    if (!domainForm.domain?.trim()) {
      notifyError("Domain is required");
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingDomainId) {
        await StoreServices.updateStoreDomain(id, editingDomainId, domainForm);
        notifySuccess("Domain updated successfully");
      } else {
        await StoreServices.createStoreDomain(id, domainForm);
        notifySuccess("Domain added successfully");
      }
      setShowDomainModal(false);
      setDomainForm({ domain: "", isPrimary: false, ssl: false, verified: false });
      setEditingDomainId(null);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to save domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    try {
      setIsSubmitting(true);
      await StoreServices.deleteStoreDomain(id, domainId);
      notifySuccess("Domain deleted successfully");
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to delete domain");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportAudit = async () => {
    try {
      setIsSubmitting(true);
      const body = { format: "csv", storeId: id };
      if (auditFilters.module) body.module = auditFilters.module;
      if (auditFilters.action) body.action = auditFilters.action;
      if (auditFilters.severity) body.severity = auditFilters.severity;
      if (auditFilters.status) body.status = auditFilters.status;
      if (auditFilters.dateFrom) body.startDate = auditFilters.dateFrom;
      if (auditFilters.dateTo) body.endDate = auditFilters.dateTo;

      const created = await StoreServices.requestAuditExport(body);
      const jobId = created?.data?.jobId || created?.jobId;
      if (!jobId) {
        notifyError("Export request was not accepted");
        return;
      }

      let jobStatus = "";
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const job = await StoreServices.getAuditExportStatus(jobId);
        jobStatus = job?.data?.status || "";
        if (jobStatus === "completed" || jobStatus === "failed") break;
      }
      if (jobStatus !== "completed") {
        notifyError("Export is still processing or failed  try again shortly");
        return;
      }

      const blob = await StoreServices.downloadAuditExport(jobId);
      const url = URL.createObjectURL(new Blob([blob], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `store-${id}-audit.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notifySuccess("Audit trail exported");
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to export the audit trail");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMaintenance = async () => {
    try {
      setIsSubmitting(true);
      const result = await StoreServices.updateStoreMaintenance(id, {
        enabled: Boolean(maintenanceForm.enabled),
        message: maintenanceForm.message,
      });
      notifySuccess(result.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled");
      setTabData((prev) => ({ ...prev, maintenance: { ...(prev.maintenance || {}), ...result } }));
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to update maintenance mode");
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshApiTab = () => {
    setTabData((prev) => ({ ...prev, api: null }));
    setTabUnavailable((prev) => ({ ...prev, api: false }));
    fetchTabData("api");
  };

  const openCreateApiKeyModal = () => {
    setApiKeyForm({ name: "", scopes: [], expiresInDays: "" });
    setShowApiKeyModal(true);
  };

  const handleCreateApiKey = async () => {
    if (!apiKeyForm.name.trim()) {
      notifyError("API key name is required");
      return;
    }
    if (apiKeyForm.scopes.length === 0) {
      notifyError("Select at least one scope");
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await StoreServices.createStoreApiKey(id, {
        name: apiKeyForm.name.trim(),
        scopes: apiKeyForm.scopes,
        expiresAt: apiKeyForm.expiresInDays
          ? new Date(Date.now() + Number(apiKeyForm.expiresInDays) * 86400000).toISOString()
          : null,
      });
      setShowApiKeyModal(false);
      setRevealedSecret({ title: `API key "${created.name}" created`, secret: created.secret });
      refreshApiTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to create the API key");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRotateApiKey = async (keyId) => {
    try {
      setIsSubmitting(true);
      const rotated = await StoreServices.regenerateStoreApiKey(id, keyId);
      notifySuccess("API key rotated  copy the new secret now");
      setRevealedSecret({ title: "New secret generated", secret: rotated.secret });
      setConfirmAction(null);
      refreshApiTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to rotate the API key");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeRevokeApiKey = async (keyId) => {
    try {
      setIsSubmitting(true);
      await StoreServices.revokeStoreApiKey(id, keyId);
      notifySuccess("API key revoked");
      setConfirmAction(null);
      refreshApiTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to revoke the API key");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleSetApiKeyExpiry = async (keyId) => {
    setPromptConfig({
      title: "Set API key expiration",
      message: "Enter a date as YYYY-MM-DD, or \"never\" to remove the expiration.",
      placeholder: "YYYY-MM-DD",
      defaultValue: "",
    });
    setPendingPromptAction(async (value) => {
      if (!value) return;
      const normalized = value.trim().toLowerCase();
      let expiresAt = null;
      if (normalized !== "never") {
        expiresAt = new Date(normalized);
        if (Number.isNaN(expiresAt.getTime())) {
          notifyError("Invalid date format  use YYYY-MM-DD");
          setIsSubmitting(false);
          return;
        }
      }
      try {
        await StoreServices.setStoreApiKeyExpiry(id, keyId, expiresAt ? expiresAt.toISOString() : null);
        notifySuccess(expiresAt ? "Expiration updated" : "Expiration cleared");
        refreshApiTab();
      } catch (e) {
        notifyError(e?.response?.data?.message || "Unable to update the expiration");
      } finally {
        setIsSubmitting(false);
      }
    });
    setIsPromptOpen(true);
  };

  const refreshWebhookTab = () => {
    setTabData((prev) => ({ ...prev, webhooks: null }));
    setTabUnavailable((prev) => ({ ...prev, webhooks: false }));
    fetchTabData("webhooks");
  };

  const openCreateWebhookModal = () => {
    setWebhookForm({ url: "", events: [] });
    setShowWebhookModal(true);
  };

  const handleCreateWebhook = async () => {
    if (!webhookForm.url.trim()) {
      notifyError("Webhook URL is required");
      return;
    }
    if (webhookForm.events.length === 0) {
      notifyError("Select at least one event type");
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await StoreServices.createStoreWebhook(id, {
        url: webhookForm.url.trim(),
        events: webhookForm.events,
      });
      setShowWebhookModal(false);
      setRevealedSecret({ title: `Signing secret for ${created.url}`, secret: created.secret });
      notifySuccess("Webhook created");
      refreshWebhookTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to create the webhook");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeTestWebhook = async (webhookId) => {
    try {
      setIsSubmitting(true);
      await StoreServices.testStoreWebhook(id, webhookId);
      notifySuccess("Test delivered successfully");
      refreshWebhookTab();
    } catch (e) {
      if (e?.response?.status === 502) {
        notifyError(e?.response?.data?.message || "Test delivery failed");
        refreshWebhookTab();
      } else {
        notifyError(e?.response?.data?.message || "Unable to send the test delivery");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeToggleWebhookStatus = async (webhookId, nextStatus) => {
    try {
      setIsSubmitting(true);
      await StoreServices.setStoreWebhookStatus(id, webhookId, nextStatus);
      notifySuccess(nextStatus === "active" ? "Webhook enabled" : "Webhook disabled");
      refreshWebhookTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to update the webhook status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRotateWebhookSecret = async (webhookId) => {
    try {
      setIsSubmitting(true);
      const rotated = await StoreServices.rotateStoreWebhookSecret(id, webhookId);
      setRevealedSecret({ title: "New signing secret", secret: rotated.secret });
      setConfirmAction(null);
      refreshWebhookTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to rotate the secret");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeDeleteWebhook = async (webhookId) => {
    try {
      setIsSubmitting(true);
      await StoreServices.deleteStoreWebhook(id, webhookId);
      notifySuccess("Webhook deleted");
      setConfirmAction(null);
      refreshWebhookTab();
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to delete the webhook");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const openDeliveriesModal = async (webhook) => {
    setDeliveriesModal({ webhookId: webhook._id, url: webhook.url });
    setDeliveriesLoading(true);
    setDeliveriesData([]);
    try {
      const deliveries = await StoreServices.getStoreWebhookDeliveries(id, webhook._id);
      setDeliveriesData(Array.isArray(deliveries) ? deliveries : []);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to load delivery history");
      setDeliveriesData([]);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleRetryDelivery = async (deliveryId) => {
    if (!deliveriesModal) return;
    try {
      setIsSubmitting(true);
      await StoreServices.retryStoreWebhookDelivery(id, deliveriesModal.webhookId, deliveryId);
      notifySuccess("Redelivery attempted");
      const deliveries = await StoreServices.getStoreWebhookDeliveries(id, deliveriesModal.webhookId);
      setDeliveriesData(Array.isArray(deliveries) ? deliveries : []);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to retry the delivery");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchStoreRoles = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setAdminRolesLoading(true);
        const roles = await StoreServices.getStoreRoles(id);
        setAdminRoles(Array.isArray(roles) ? roles : []);
      } catch (e) {
        if (!silent) notifyError(e?.response?.data?.message || "Unable to load store roles");
        setAdminRoles([]);
      } finally {
        if (!silent) setAdminRolesLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (activeTab === "maintenance" && tabData.maintenance) {
      setMaintenanceForm({
        enabled: Boolean(tabData.maintenance.enabled),
        message: tabData.maintenance.message || "",
      });
    }
  }, [activeTab, tabData.maintenance]);

  useEffect(() => {
    if (activeTab !== "logs") return;    let cancelled = false;
    (async () => {
      setSystemLogsLoading(true);
      try {
        const data = await StoreServices.getStoreSystemLogs(id, { service: systemLogsService, limit: 60 });
        if (!cancelled) setSystemLogsRows(data?.logs || []);
      } catch (e) {
        if (!cancelled) notifyError(e?.response?.data?.message || "Unable to load technical logs");
      } finally {
        if (!cancelled) setSystemLogsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, systemLogsService]);

  useEffect(() => {
    if (activeTab === "admins") {
      fetchStoreRoles({ silent: true });
    }
  }, [activeTab, fetchStoreRoles]);

  useEffect(() => {
    if (activeTab !== "backups") return;
    const rows = tabData.backups || [];
    const hasActiveJob = rows.some((job) => job.status === "queued" || job.status === "running");
    if (!hasActiveJob) return;
    const timer = setTimeout(() => refreshBackupsTab(), 2500);
    return () => clearTimeout(timer);
  }, [activeTab, tabData.backups]);

  useEffect(() => {
    if (activeTab !== "analytics") return;
    let cancelled = false;
    (async () => {
      setAnalyticsLoading(true);
      try {
        const params = { range: analyticsRange };
        if (analyticsRange === "custom") {
          if (analyticsCustomFrom) params.from = analyticsCustomFrom;
          if (analyticsCustomTo) params.to = analyticsCustomTo;
        }
        const data = await StoreServices.getStoreAnalytics(id, params);
        if (!cancelled) setAnalyticsData(data || null);
      } catch (e) {
        if (!cancelled) notifyError(e?.response?.data?.message || "Unable to load analytics");
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, analyticsRange, analyticsCustomFrom, analyticsCustomTo]);

  useEffect(() => {
    if (activeTab !== "audit") return;
    let cancelled = false;
    (async () => {
      setAuditLoading(true);
      try {
        const params = Object.fromEntries(Object.entries(auditFilters).filter(([, value]) => value));
        const data = await StoreServices.getStoreLogs(id, { ...params, page: auditPage, limit: 25 });
        if (!cancelled) {
          setAuditRows(data?.logs || []);
          setAuditPagination(data?.pagination || null);
        }
      } catch (e) {
        if (!cancelled) notifyError(e?.response?.data?.message || "Unable to load the audit trail");
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, auditPage, auditFilters]);

  const openAddAdminModal = () => {
    setAdminForm({ name: "", email: "", phone: "", roleId: "" });
    setAdminModalMode("create");
    setAdminUserSearch("");
    setAdminUserResults([]);
    setSelectedExistingUser(null);
    setShowAdminModal(true);
    fetchStoreRoles();
  };

  useEffect(() => {
    if (!showAdminModal || adminModalMode !== "existing") return;
    const query = adminUserSearch.trim();
    if (query.length < 2) {
      setAdminUserResults([]);
      setAdminUserSearchLoading(false);
      return;
    }
    setAdminUserSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await userAPI.getAllUsers({ search: query, limit: 8 });
        const users = Array.isArray(response) ? response : response?.data || [];
        setAdminUserResults(users);
      } catch (e) {
        setAdminUserResults([]);
      } finally {
        setAdminUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [showAdminModal, adminModalMode, adminUserSearch]);

  const handleAddAdminSubmit = async () => {
    if (!adminForm.roleId) {
      notifyError("Please select a role for this admin");
      return;
    }
    if (adminModalMode === "existing" && !selectedExistingUser) {
      notifyError("Please search and select an existing user");
      return;
    }
    if (adminModalMode === "create" && !adminForm.email?.trim()) {
      notifyError("Email is required");
      return;
    }
    try {
      setIsSubmitting(true);
      if (adminModalMode === "existing") {
        await StoreServices.addStoreAdmin(id, {
          name: selectedExistingUser.name || undefined,
          email: selectedExistingUser.email,
          role: adminForm.roleId,
        });
        notifySuccess(`${selectedExistingUser.name || selectedExistingUser.email} added as store admin`);
      } else {
        await StoreServices.addStoreAdmin(id, {
          name: adminForm.name?.trim() || undefined,
          email: adminForm.email.trim(),
          phone: adminForm.phone?.trim() || undefined,
          role: adminForm.roleId,
        });
        notifySuccess("Admin added successfully. A welcome email with their password has been sent.");
      }
      setShowAdminModal(false);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to add admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStaffRoleChange = async (member, roleId) => {
    const userId = member.userId || member._id;
    if (!userId || !roleId) return;
    try {
      setIsSubmitting(true);
      await StoreServices.updateStoreStaffRole(id, userId, roleId);
      notifySuccess("Role updated successfully");
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to update the role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStaffMembership = async (member) => {
    const userId = member.userId || member._id;
    if (!userId) return;
    const nextStatus = member.membershipStatus === "suspended" ? "active" : "suspended";
    try {
      setIsSubmitting(true);
      await StoreServices.updateStoreStaffStatus(id, userId, nextStatus);
      notifySuccess(nextStatus === "suspended" ? "Access suspended" : "Access restored");
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to update staff access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRemoveStaff = async (userId) => {
    if (!userId) {
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await StoreServices.removeStoreStaff(id, userId);
      notifySuccess("Staff member removed");
      setConfirmAction(null);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to remove staff member");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const openInvoiceDetail = async (invoiceId) => {
    setInvoiceModalOpen(true);
    setInvoiceDetailLoading(true);
    setInvoiceDetail(null);
    try {
      const response = await paymentAPI.getInvoice(invoiceId);
      setInvoiceDetail(response?.data || response || null);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to load the invoice");
      setInvoiceModalOpen(false);
    } finally {
      setInvoiceDetailLoading(false);
    }
  };

  const handleDownloadInvoicePdf = async (invoiceId, invoiceNumber) => {
    try {
      setIsSubmitting(true);
      const blob = await paymentAPI.getInvoicePdf(invoiceId);
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to download the invoice PDF");
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeRefundPayment = async (row) => {
    if (!row?.paymentId) {
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await paymentAPI.createRefund({
        transactionId: row.paymentId,
        paymentId: row.paymentId,
        amount: Number(row.amount ?? 0),
        currency: String(row.currency || store.billing?.summary?.currency || "USD").toUpperCase(),
        reason: "Refunded from store billing by admin",
      });
      notifySuccess("Refund created successfully");
      setConfirmAction(null);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to create the refund");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const executeRetryBillingPayment = async () => {
    const subscriptionId = store.currentSubscriptionId || store.subscription?.id;
    if (!subscriptionId) {
      notifyError("No subscription found for this store");
      setConfirmAction(null);
      return;
    }
    try {
      setIsSubmitting(true);
      await planAPI.retryFailedPayment(subscriptionId);
      notifySuccess("Payment retry scheduled");
      setConfirmAction(null);
      await fetchStore({ silent: true });
    } catch (e) {
      notifyError(e?.response?.data?.message || "Unable to retry the payment");
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const handleQuickAction = async (actionType) => {
    try {
      setIsSubmitting(true);
      switch (actionType) {
        case "activate":
          await StoreServices.updateStoreStatus(id, true);
          setIsActive(true);
          break;
        case "suspend":
          await StoreServices.updateStoreStatus(id, false);
          setIsActive(false);
          break;
        case "delete":
          await StoreServices.deleteStore(id);
          history.push("/stores");
          return;
        case "restore":
          await StoreServices.restoreStore(id);
          setIsActive(true);
          setStatus("inactive");
          break;
        default:
          break;
      }
      notifySuccess(`${actionType.charAt(0).toUpperCase() + actionType.slice(1)} action completed successfully.`);
      setConfirmAction(null);
    } catch (e) {
      notifyError(e?.response?.data?.message || "The requested action could not be completed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!adminInfo?.email) return <Redirect to="/login" />;
  if (!isSuperAdmin) return <Redirect to="/dashboard" />;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading store details&</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="text-lg" />
          <span className="font-semibold">Unable to load the store</span>
        </div>
        <p className="mt-2 text-sm">{error}</p>
      </div>
    );
  }

  const confirmDialog = (() => {
    switch (confirmAction?.type) {
      case "delete":
        return {
          title: "Delete store",
          message: `${store.name} will be deactivated immediately and permanently deleted after 30 days. This action is logged in the audit trail and can be undone before then.`,
          confirmLabel: "Delete store",
        };
      case "suspend":
        return { title: "Suspend store", message: `Suspend ${store.name}? Orders and billing for this store will be blocked.`, confirmLabel: "Suspend store" };
      case "activate":
        return { title: "Activate store", message: `Activate ${store.name}? This will restore access to the storefront and administration.`, confirmLabel: "Activate store" };
      case "restore":
        return { title: "Restore store", message: `Restore ${store.name} from deleted state? The store will be reactivated and accessible again.`, confirmLabel: "Restore store" };
      case "pause-subscription":
        return { title: "Pause subscription", message: `Pause the subscription for ${store.name}? Billing will stop and the subscription can be resumed at any time.`, confirmLabel: "Pause subscription" };
      case "block-owner":
        return { title: "Block store owner", message: `Block ${store.owner?.name || store.owner?.email || "this owner"}? They will immediately lose access to this store's administration.`, confirmLabel: "Block user" };
      case "unblock-owner":
        return { title: "Unblock store owner", message: `Unblock ${store.owner?.name || store.owner?.email || "this owner"}? Access to the store administration will be restored.`, confirmLabel: "Unblock user" };
      case "revoke-owner-sessions":
        return { title: "Revoke sessions", message: `Revoke all active sessions for ${store.owner?.name || store.owner?.email || "this owner"}? They will be signed out from every device.`, confirmLabel: "Revoke sessions" };
      case "remove-staff":
        return { title: "Remove staff member", message: `Remove ${confirmAction.staffName || "this member"} from ${store.name}? They will immediately lose access to this store's administration.`, confirmLabel: "Remove" };
      case "refund-payment": {
        const refundRow = confirmAction.row || {};
        return { title: "Refund payment", message: `Refund ${formatCurrency(refundRow.amount, refundRow.currency)} for transaction ${refundRow.transactionId || refundRow.reference || ""}? A refund record will be created for approval.`, confirmLabel: "Refund" };
      }
      case "retry-billing":
        return { title: "Retry payment", message: `Retry the failed payment for ${store.name}? The charge will be submitted to the payment provider again.`, confirmLabel: "Retry payment" };
      case "rotate-api-key":
        return { title: "Rotate API key", message: `Rotate "${confirmAction.keyName}"? The current secret stops working immediately and a new one is generated.`, confirmLabel: "Rotate key" };
      case "revoke-api-key":
        return { title: "Revoke API key", message: `Revoke "${confirmAction.keyName}"? Integrations using this key will immediately lose access.`, confirmLabel: "Revoke key" };
      case "delete-webhook":
        return { title: "Delete webhook", message: `Delete the webhook ${confirmAction.webhookUrl}? Its delivery history will be removed.`, confirmLabel: "Delete webhook" };
      case "delete-backup":
        return { title: "Delete backup", message: `Delete this ${confirmAction.backupType || "manual"} backup from ${formatDate(confirmAction.backupDate)}? The stored artifact will be removed.`, confirmLabel: "Delete backup" };
      case "login-as-owner":
        return { title: "Login as owner", message: `Generate an impersonation token for ${confirmAction.ownerName || "the store owner"}? This action is audited.`, confirmLabel: "Login as owner" };
      case "restore-backup":
        return { title: "Restore configuration", message: `Restore this store's configuration from the backup created on ${formatDate(confirmAction.backupDate)}? Current name, domains, settings, and staff memberships will be overwritten. Products, orders, and customer data are not affected.`, confirmLabel: "Restore" };
      default:
        return { title: confirmAction?.type, message: `Are you sure you want to proceed with "${confirmAction?.type}" for ${store.name}?`, confirmLabel: "Confirm" };
    }
  })();

  return (
    <>
      <PageTitle>Store Details</PageTitle>

      <AnimatedContent>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button type="button" onClick={() => history.push("/stores")} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-emerald-600 dark:text-gray-300">
            <FiArrowLeft size={15} />
            Back to stores
          </Button>

<div className="flex flex-nowrap items-center gap-1.5">
            <Button
              size="small"
              layout="outline"
              className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium text-gray-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300"
              onClick={handleViewStorefront}
              disabled={!store?._id}
            >
              <FiGlobe size={14} />
              View storefront
            </Button>
            <Button
              size="small"
              layout="outline"
              className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium text-gray-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
              onClick={() => setActiveTab("settings")}
            >
              <FiSettings size={14} />
              Edit Store
            </Button>
            <Button
              size="small"
              layout="outline"
              className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium shadow-sm transition dark:border-gray-600 ${
                isActive
                  ? "text-amber-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 dark:text-amber-300 dark:hover:border-amber-500 dark:hover:bg-amber-900/20 dark:hover:text-amber-200"
                  : "text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-200"
              }`}
              onClick={() => setConfirmAction({ type: isActive ? "suspend" : "activate" })}
            >
              <FiAlertTriangle size={14} />
              {isActive ? "Suspend" : "Activate"}
            </Button>
            <Button
              size="small"
              layout="outline"
              className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium text-gray-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-violet-500 dark:hover:bg-violet-900/20 dark:hover:text-violet-300"
              onClick={handleBackup}
              disabled={isSubmitting}
              title="Queue a configuration snapshot of this store"
            >
              <FiDatabase size={14} />
              Backup
            </Button>
            {store.status === "deleted" ? (
              <Button
                size="small"
                layout="outline"
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-emerald-300 font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-600 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-200"
                onClick={() => setConfirmAction({ type: "restore" })}
                disabled={isSubmitting}
              >
                <FiSave size={14} />
                Restore store
              </Button>
            ) : (
              <Button
                size="small"
                layout="outline"
                className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium text-gray-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-gray-600 dark:text-gray-200 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                onClick={() => setConfirmAction({ type: "delete" })}
                disabled={isSubmitting}
              >
                <FiTrash2 size={14} />
                Delete store
              </Button>
            )}
            <Button
              size="small"
              layout="outline"
              className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl border-gray-300 font-medium text-gray-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-600 hover:text-white dark:border-gray-600 dark:text-gray-200 dark:hover:border-emerald-500 dark:hover:bg-emerald-600 dark:hover:text-white"
              onClick={() => openPlanModal("upgrade")}
              disabled={isSubmitting}
            >
              <FiZap size={14} />
              Upgrade
            </Button>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                {imageUrl ? (
                  <img src={getLogoUrl(imageUrl)} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-emerald-600">{store.name?.charAt(0)?.toUpperCase()}</span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-bold text-gray-900 dark:text-white">{store.name}</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{store.status}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="truncate">{store.slug}</span>
                  <span>{"\u2022"}</span>
                  <span>{store.country}</span>
                  <span>{"\u2022"}</span>
                  <span>{store.currency}</span>
                  <span>{"\u2022"}</span>
                  <span>{store.language}</span>
                  <span>{"\u2022"}</span>
                  <span>{store.timezone}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Plan: {store.plan}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Created: {formatDate(store.createdAt)}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">Last admin login: {formatDate(store.lastLogin)}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{store.health}</span>
                  {store.compliance && <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{store.compliance}</span>}
                </div>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2 xl:min-w-[320px]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Slug</div>
                <div className="mt-1 font-semibold truncate">{store.slugUrl}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Status</div>
                <div className="mt-1 font-semibold">{store.status}</div>
              </div>
            </div>
          </div>
        </div>

<div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full lg:w-60 lg:flex-shrink-0">
            <StoreDetailTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <div className="min-w-0 flex-1 space-y-6 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-6">
          {activeTab === "overview" && (
            <>
              <SectionHeader title="Store overview" description="Complete summary of the store, its health, activity and critical metrics." />
              <SummaryGrid rows={summaryValues} />

              <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Store facts</h4>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${store.health === "Healthy" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}`}>{store.health}</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Owner</div>
                         <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{store.owner.name}</div>
                         <div className="truncate text-xs text-gray-500 dark:text-gray-400">{store.owner.email}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Plan</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{store.plan}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Renewal {formatDate(store.renewalDate)}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Trial end</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(store.trialEndDate)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Billing cycle: {store.subscription?.billingCycle || store.billingCycle || ""}</div>
                      </div>
                      <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Last activity</div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{formatDate(store.lastActivity || store.updatedAt)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Subscription: {store.subscription?.status || store.subscriptionStatus || ""}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Usage overview</h4>
                    <div className="space-y-4">
                      {store.quotaRows.map((row) => (
                        <div key={row.label}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-300">{row.label}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{formatNumber(row.used)} / {formatNumber(row.limit)}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={`h-full rounded-full ${getUsagePercent(row.used, row.limit) >= 90 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(getUsagePercent(row.used, row.limit), 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Quick metrics</h4>
                    <SmallStatList entries={[{ label: "Active admins", value: store.activeAdmins }, { label: "Usage ratio", value: `${store.usageRatio ?? 0}%` }, { label: "Errors count", value: store.errorsCount ?? 0 }, { label: "Failed webhooks", value: store.failedWebhooks ?? 0 }]} />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Health & compliance</h4>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                        <span>Compliance</span>
                        {store.compliance ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{store.compliance}</span>
                        ) : (
                          <span className="text-gray-400"></span>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                        <span>Maintenance mode</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getMaintenanceLabel(store.maintenanceMode) === "Enabled" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{getMaintenanceLabel(store.maintenanceMode)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "subscription" && (
            <>
              <SectionHeader title="Subscription" description="Current subscription state, renewal policy and billing visibility." />
              {!hasSubscription && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  No subscription is attached to this store yet. Assign a plan to activate billing.
                </div>
              )}
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Current plan</div>
                      <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{store.plan || ""}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(subscriptionStatusValue)}`}>
                      {getSubscriptionStatusLabel(subscriptionStatusValue)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Start date</div><div className="mt-1 font-medium">{formatDate(store.subscription?.startedAt || store.createdAt)}</div></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Renewal date</div><div className="mt-1 font-medium">{formatDate(store.renewalDate)}</div></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Trial ends</div><div className="mt-1 font-medium">{formatDate(store.subscription?.trialEndsAt || store.trialEndDate)}</div></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Billing cycle</div><div className="mt-1 font-medium capitalize">{store.subscription?.billingCycle || store.billingCycle || ""}</div></div>
                  </div>

                  {RESUMABLE_STATES.includes(subscriptionStatusValue) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      This subscription is {getSubscriptionStatusLabel(subscriptionStatusValue).toLowerCase()}. Use "Resume subscription" to reactivate it.
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">Subscription actions</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Available actions adapt to the current subscription state.</p>
                  </div>
                  <div className="w-full max-w-[260px] space-y-2">
                    {subscriptionActionButtons.map((action) => (
                      <div key={action.key}>
                        <Button
                          size="small"
                          layout={action.primary ? undefined : "outline"}
                          className={`w-full items-center justify-center gap-2 rounded-xl ${action.className || ""}`}
                          onClick={() => handleSubscriptionAction(action.key)}
                          disabled={isSubmitting || action.disabled}
                        >
                          <action.icon size={14} />
                          {action.label}
                        </Button>
                        {action.disabled && action.hint ? (
                          <p className="mt-1 text-[11px] leading-tight text-gray-400 dark:text-gray-500">{action.hint}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "owner" && (
            <>
              <SectionHeader title="Store owner" description="Primary owner profile and responsibility matrix." />
              {!hasOwner && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  No owner account is attached to this store yet.
                </div>
              )}
              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{store.owner.name?.charAt(0)}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{store.owner.name || ""}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(ownerStatusValue)}`}>{store.owner.status || "Unknown"}</span>
                      </div>
                      <div className="truncate text-sm text-gray-500 dark:text-gray-400">{store.owner.email}</div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"><span>Phone</span><span>{store.owner.phone || ""}</span></div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"><span>Country</span><span>{store.owner.country || ""}</span></div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                      <span>Two-factor authentication</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${store.owner.twoFactorEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{store.owner.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                    </div>
                    {ownerBlocked && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                        This account is currently {ownerStatusValue}. Use "Unblock user" to restore access.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">Owner actions</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sensitive actions require confirmation before they run.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Date joined</div><div className="mt-1 font-medium">{formatDate(store.owner.createdAt)}</div></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">Last login</div><div className="mt-1 font-medium">{formatDate(store.owner.lastLogin)}</div></div>
                    <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"><div className="text-xs uppercase tracking-[0.18em] text-gray-500">User ID</div><div className="mt-1 truncate font-mono text-xs font-medium text-gray-600 dark:text-gray-300">{store.owner._id || ""}</div></div>
                  </div>
                  <div className="w-full max-w-[260px] space-y-2">
                    {ownerActionButtons.map((action) => (
                      <Button
                        key={action.key}
                        size="small"
                        layout={action.primary ? undefined : "outline"}
                        className={`w-full items-center justify-center gap-2 rounded-xl ${action.className || ""}`}
                        onClick={() => handleOwnerAction(action.key)}
                        disabled={isSubmitting || action.disabled}
                      >
                        <action.icon size={14} />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "admins" && (
            <>
              <SectionHeader
                title="Store admins"
                description="Users with elevated access to this store."
                action={
                  <Button size="small" className="inline-flex items-center gap-1.5 rounded-xl" onClick={openAddAdminModal}>
                    <FiUserPlus size={14} />
                    Add admin
                  </Button>
                }
              />
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Member</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Role</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Account</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Access</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">2FA</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Last login</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {store.adminList.length === 0 ? (
                      <tr className="bg-white dark:bg-gray-900">
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No admins yet for this store.</td>
                      </tr>
                    ) : (
                      store.adminList.map((admin) => {
                        const userId = String(admin.userId || admin._id || "");
                        const isOwnerRow = Boolean(store.owner?._id) && userId === String(store.owner._id);
                        return (
                          <tr key={userId || admin.email} className="bg-white dark:bg-gray-900">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{admin.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              {isOwnerRow ? (
                                <span className="text-gray-600 dark:text-gray-300">{admin.role?.name || ""}</span>
                              ) : (
                                <select
                                  value={admin.role?._id || ""}
                                  onChange={(e) => handleStaffRoleChange(admin, e.target.value)}
                                  disabled={isSubmitting}
                                  className="w-full max-w-[170px] rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                                >
                                  <option value="">No role</option>
                                  {adminRoles.map((roleOption) => (
                                    <option key={roleOption._id} value={roleOption._id}>{roleOption.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(admin.status)}`}>{admin.status}</span>
                            </td>
                            <td className="px-4 py-3">
                              {isOwnerRow ? (
                                <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold uppercase text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">Owner</span>
                              ) : (
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(admin.membershipStatus)}`}>{admin.membershipStatus || "Unknown"}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{admin.twoFactorEnabled !== undefined ? (admin.twoFactorEnabled ? "Enabled" : "Disabled") : (admin.twoFactor ? "Enabled" : "Disabled")}</td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(admin.lastLogin)}</td>
                            <td className="px-4 py-3">
                              {isOwnerRow ? (
                                <span className="block text-right text-xs text-gray-400"></span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="small"
                                    layout="outline"
                                    className={`rounded-xl font-medium ${admin.membershipStatus === "suspended" ? "border-gray-300 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:border-gray-600 dark:text-emerald-300" : "border-gray-300 text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:border-gray-600 dark:text-amber-300"}`}
                                    onClick={() => handleToggleStaffMembership(admin)}
                                    disabled={isSubmitting}
                                  >
                                    {admin.membershipStatus === "suspended" ? "Activate" : "Suspend"}
                                  </Button>
                                  <Button
                                    size="small"
                                    layout="outline"
                                    className="rounded-xl font-medium text-red-700 hover:border-red-400 hover:bg-red-50 dark:text-red-300"
                                    onClick={() => setConfirmAction({ type: "remove-staff", userId, staffName: admin.name })}
                                    disabled={isSubmitting}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add store admin</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pick an existing user or invite a new one by email.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                      {[["create", "Create new"], ["existing", "Existing user"]].map(([modeKey, modeLabel]) => (
                        <Button
                          key={modeKey}
                          type="button"
                          onClick={() => setAdminModalMode(modeKey)}
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${adminModalMode === modeKey ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
                        >
                          {modeLabel}
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4 space-y-3">
                      {adminModalMode === "create" ? (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Name</label>
                            <input type="text" value={adminForm.name} onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name (optional)" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Email *</label>
                            <input type="email" value={adminForm.email} onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</label>
                            <input type="tel" value={adminForm.phone} onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+216 ..." className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search users</label>
                            <input
                              type="text"
                              value={adminUserSearch}
                              onChange={(e) => {
                                setAdminUserSearch(e.target.value);
                                setSelectedExistingUser(null);
                              }}
                              placeholder="Name or email (min. 2 characters)"
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </div>
                          <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl">
                            {adminUserSearchLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                              </div>
                            ) : adminUserResults.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
                                {adminUserSearch.trim().length < 2 ? "Type at least 2 characters to search." : "No users found."}
                              </p>
                            ) : (
                              adminUserResults.map((userResult) => {
                                const isSelected = selectedExistingUser?._id === userResult._id;
                                return (
                                  <Button
                                    key={userResult._id}
                                    type="button"
                                    onClick={() => setSelectedExistingUser(userResult)}
                                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"}`}
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{(userResult.name || userResult.email || "?").charAt(0).toUpperCase()}</span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{userResult.name || userResult.email}</span>
                                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{userResult.email}</span>
                                    </span>
                                    {userResult.status && (
                                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(userResult.status)}`}>{userResult.status}</span>
                                    )}
                                  </Button>
                                );
                              })
                            )}
                          </div>
                          {selectedExistingUser && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                              Selected: <span className="font-semibold">{selectedExistingUser.name || selectedExistingUser.email}</span> ({selectedExistingUser.email})
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Role *</label>
                        {adminRolesLoading ? (
                          <div className="flex items-center justify-center rounded-xl border border-gray-200 py-4 dark:border-gray-700">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                          </div>
                        ) : (
                          <select
                            value={adminForm.roleId}
                            onChange={(e) => setAdminForm((f) => ({ ...f, roleId: e.target.value }))}
                            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                          >
                            <option value="">Select a role</option>
                            {adminRoles.map((roleOption) => (
                              <option key={roleOption._id} value={roleOption._id}>{roleOption.name}</option>
                            ))}
                          </select>
                        )}
                        {!adminRolesLoading && adminRoles.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No roles found for this store.</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <Button layout="outline" onClick={() => setShowAdminModal(false)} disabled={isSubmitting}>Cancel</Button>
                      <Button onClick={handleAddAdminSubmit} disabled={isSubmitting || !adminForm.roleId || (adminModalMode === "create" ? !adminForm.email.trim() : !selectedExistingUser)}>
                        {isSubmitting ? "Adding..." : "Add admin"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "teams" && (
            <>
              <SectionHeader title="Teams" description="Organizational teams for this store." />
              {store.teams?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No teams configured for this store.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {store.teams.map((team) => (
                    <div key={team._id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex items-center justify-between">
                        <div>
                           <h4 className="truncate text-base font-semibold text-gray-900 dark:text-white">{team.name}</h4>
                           <p className="truncate text-sm text-gray-500 dark:text-gray-400">{team.description || "No description"}</p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                          {team.memberCount ?? team.members?.length ?? 0} members
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                        {team.leader && (
                          <div>
                            <span className="text-xs uppercase tracking-[0.18em] text-gray-500">Leader: </span>
                            <span className="font-medium">{team.leader.name || ""}</span>
                            <span className="text-xs text-gray-400 ml-1">{team.leader.email}</span>
                          </div>
                        )}
                        {team.department && (
                          <div>
                            <span className="text-xs uppercase tracking-[0.18em] text-gray-500">Department: </span>
                            <span className="font-medium">{team.department}</span>
                          </div>
                        )}
                      </div>
                      {team.members?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {team.members.map((member) => (
                            <span key={member._id} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              {member.name || member.email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "billing" && (
            <>
              <SectionHeader title="Billing" description="What money moved: invoices, payments, refunds, coupons and failed attempts." />
              {(() => {
                const billing = store.billing || {};
                const summary = billing.summary || {};
                const currency = summary.currency || store.currency || "USD";
                const allTransactions = billing.transactions || [];
                const filteredTransactions =
                  billingFilter === "all" ? allTransactions : allTransactions.filter((tx) => tx.type === billingFilter);
                const typeFilters = [
                  ["all", "All", allTransactions.length],
                  ["invoice", "Invoices", allTransactions.filter((tx) => tx.type === "invoice").length],
                  ["payment", "Payments", allTransactions.filter((tx) => tx.type === "payment").length],
                  ["refund", "Refunds", allTransactions.filter((tx) => tx.type === "refund").length],
                  ["attempt", "Failed attempts", allTransactions.filter((tx) => tx.type === "attempt").length],
                ];
                const summaryCards = [
                  { label: "Current MRR", value: formatCurrency(summary.mrr, currency), tone: "text-emerald-700 dark:text-emerald-300" },
                  { label: "Total paid", value: formatCurrency(summary.totalPaid, currency), tone: "" },
                  { label: "Outstanding", value: formatCurrency(summary.outstanding, currency), tone: Number(summary.outstanding) > 0 ? "text-amber-700 dark:text-amber-300" : "" },
                  { label: "Failed payments", value: `${formatCurrency(summary.failedPayments?.amount, currency)} (${formatNumber(summary.failedPayments?.count)})`, tone: (summary.failedPayments?.count || 0) > 0 ? "text-red-700 dark:text-red-300" : "" },
                  { label: "Refunds", value: `${formatCurrency(summary.refunds?.amount, currency)} (${formatNumber(summary.refunds?.count)})`, tone: "" },
                  { label: "Next billing", value: formatDate(summary.nextBillingDate), tone: "" },
                ];
                const typeBadgeClasses = {
                  invoice: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
                  payment: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
                  refund: "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
                  attempt: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
                };
                return (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                      {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{card.label}</div>
                          <div className={`mt-2 text-lg font-bold text-gray-900 dark:text-white ${card.tone}`}>{card.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Coupons &amp; credits</h4>
                      {(billing.coupons?.length || 0) === 0 ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No coupons applied and no credits recorded.</p>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {billing.coupons.map((coupon, index) => (
                            <span key={`${coupon.invoiceId}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                              <FiTag size={12} /> {coupon.code}  {formatCurrency(coupon.amount, coupon.currency)}  {coupon.invoiceNumber}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {typeFilters.map(([filterKey, filterLabel, count]) => (
                        <Button
                          key={filterKey}
                          type="button"
                          onClick={() => setBillingFilter(filterKey)}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${billingFilter === filterKey ? "bg-emerald-600 text-white shadow-sm" : "border border-gray-300 bg-white text-gray-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
                        >
                          {filterLabel} ({count})
                        </Button>
                      ))}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/80">
                          <tr>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Date</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Type</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Invoice</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Amount</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Currency</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Method</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Provider</th>
                            <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Transaction ID</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredTransactions.length === 0 ? (
                            <tr className="bg-white dark:bg-gray-900">
                              <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No transactions for this filter.</td>
                            </tr>
                          ) : (
                            filteredTransactions.map((tx) => {
                              const canRefund = tx.type === "payment" && String(tx.status).toLowerCase() === "paid";
                              return (
                                <tr key={tx._id} className="bg-white dark:bg-gray-900">
                                  <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(tx.date)}</td>
                                  <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${typeBadgeClasses[tx.type] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{tx.type}</span>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">{tx.type === "invoice" ? tx.reference : tx.invoiceId ? "" : ""}</td>
                                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(tx.amount, tx.currency)}</td>
                                  <td className="px-4 py-3 uppercase text-gray-600 dark:text-gray-300">{tx.currency}</td>
                                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(tx.status)}`}>{tx.status}</span></td>
                                  <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{tx.method || ""}</td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{tx.provider || ""}</td>
                                  <td className="max-w-[140px] truncate font-mono text-xs text-gray-500 dark:text-gray-400">{tx.transactionId || ""}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {tx.type === "invoice" && (
                                        <>
                                          <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => openInvoiceDetail(tx.invoiceId)} disabled={isSubmitting}>View</Button>
                                          <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => handleDownloadInvoicePdf(tx.invoiceId, tx.reference)} disabled={isSubmitting}>PDF</Button>
                                        </>
                                      )}
                                      {canRefund && (
                                        <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-violet-700 hover:border-violet-400 hover:bg-violet-50 dark:text-violet-300" onClick={() => setConfirmAction({ type: "refund-payment", row: tx })} disabled={isSubmitting}>Refund</Button>
                                      )}
                                      {tx.type !== "invoice" && (
                                        <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => setOpenPaymentRow(tx)} disabled={isSubmitting}>Open</Button>
                                      )}
                                      {tx.type === "attempt" && (
                                        <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-300" onClick={() => setConfirmAction({ type: "retry-billing" })} disabled={isSubmitting || !hasSubscription}>Retry</Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === "usage" && (
            <>
              <SectionHeader title="Usage" description="Store consumption against plan quotas for the current billing period." />
              {store.quotaRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No quota types configured.</p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {store.quotaRows.map((row) => (
                    <UsageMeterRow key={row.code} row={row} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "analytics" && (
            <>
              <SectionHeader title="Analytics" description="Window-bounded metrics with a 5-minute server cache." />
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {[["7d", "7d"], ["30d", "30d"], ["90d", "90d"], ["12m", "12m"], ["custom", "Custom"]].map(([rangeKey, rangeLabel]) => (
                  <Button key={rangeKey} size="small" layout={analyticsRange === rangeKey ? undefined : "outline"} className={`rounded-xl ${analyticsRange === rangeKey ? "" : "text-gray-600 dark:text-gray-300"}`} onClick={() => setAnalyticsRange(rangeKey)} disabled={analyticsLoading}>
                    {rangeLabel}
                  </Button>
                ))}
                {analyticsRange === "custom" && (
                  <>
                    <input type="date" value={analyticsCustomFrom} onChange={(e) => setAnalyticsCustomFrom(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    <input type="date" value={analyticsCustomTo} onChange={(e) => setAnalyticsCustomTo(e.target.value)} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </>
                )}
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : !analyticsData ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a period to load analytics.</p>
                </div>
              ) : (() => {
                const summary = analyticsData.summary || {};
                const nvr = analyticsData.newVsReturning || {};
                const trend = analyticsData.revenueTrend || [];
                const trendMax = Math.max(...trend.map((point) => point.value), 1);
                const totalBuyers = (nvr.newBuyers || 0) + (nvr.returningBuyers || 0);
                return (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label={`Revenue (${analyticsData.range})`} value={formatCurrency(summary.revenue)} tone="emerald" icon={FiCreditCard} />
                      <KpiCard label="Orders" value={formatNumber(summary.orders)} change={`${formatNumber(summary.paidOrders ?? 0)} paid`} tone="blue" icon={FiActivity} />
                      <KpiCard label="Avg order value" value={formatCurrency(summary.aov)} tone="amber" icon={FiZap} />
                      <KpiCard label="Customers" value={formatNumber(summary.customersTotal)} change={`${formatNumber(summary.newCustomers ?? 0)} new in window`} tone="violet" icon={FiUsers} />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Revenue trend</h4>
                        {trend.length === 0 ? (
                          <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">No paid orders in this window.</p>
                        ) : (
                          <div className="flex h-40 items-end gap-1.5 overflow-x-auto pb-1">
                            {trend.map((point) => (
                              <div key={point.label} className="flex min-w-[24px] flex-1 flex-col items-center gap-1" title={`${point.label}: ${formatCurrency(point.value)}`}>
                                <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-300" style={{ height: `${Math.max(4, Math.round((point.value / trendMax) * 130))}px` }} />
                                <span className="text-[9px] text-gray-400">{granularityShort(point.label)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">New vs returning buyers</h4>
                          <SmallStatList entries={[{ label: "New buyers (account created in window)", value: formatNumber(nvr.newBuyers ?? 0) }, { label: "Returning buyers", value: formatNumber(nvr.returningBuyers ?? 0) }]} />
                          {totalBuyers > 0 && (
                            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="bg-emerald-500" style={{ width: `${Math.round(((nvr.newBuyers || 0) / totalBuyers) * 100)}%` }} />
                              <div className="bg-violet-500" style={{ width: `${Math.round(((nvr.returningBuyers || 0) / totalBuyers) * 100)}%` }} />
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">Rates</h4>
                          <SmallStatList entries={[
                            { label: "Payment success rate", value: summary.paymentSuccessRate === null || summary.paymentSuccessRate === undefined ? "" : `${summary.paymentSuccessRate}%` },
                            { label: "Refund rate", value: summary.refundRate === null ? "" : `${summary.refundRate}%` },
                            { label: "Cancellation rate", value: summary.cancellationRate === null ? "" : `${summary.cancellationRate}%` },
                          ]} />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Top products</h4>
                        {(analyticsData.topProducts?.length || 0) === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No product sales in this window.</p>
                        ) : (
                          <div className="space-y-2">
                            {analyticsData.topProducts.map((product, index) => (
                              <div key={`${product.name}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                                <span className="min-w-0 truncate font-medium text-gray-900 dark:text-white">{index + 1}. {product.name}</span>
                                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatNumber(product.quantity)} sold  {formatCurrency(product.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Top categories</h4>
                        {(analyticsData.topCategories?.length || 0) === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No categorized sales in this window.</p>
                        ) : (
                          <div className="space-y-2">
                            {analyticsData.topCategories.map((category, index) => (
                              <div key={`${category.name}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                                <span className="font-medium text-gray-900 dark:text-white">{index + 1}. {category.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(category.revenue)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                      Conversion rate, cart abandonment and raw traffic are reported as unavailable  they require visitor tracking which is not instrumented yet. The previous orders / customers figure was not a real conversion rate.
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === "domains" && (
            <>
              <SectionHeader title="Domains" description="Primary domain, custom domains and server-checked DNS / SSL status." action={<Button size="small" className="rounded-xl" onClick={() => { setEditingDomainId(null); setDomainForm({ domain: "", isPrimary: false }); setShowDomainModal(true); }}>Add domain</Button>} />
              {(store.domains?.length || 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No domains configured for this store.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {store.domains.map((domain) => (
                    <div key={domain._id || domain.domain} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                             <span className="truncate text-lg font-semibold text-gray-900 dark:text-white">{domain.domain}</span>
                            {domain.isPrimary && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Primary</span>}
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${domain.dnsStatus === "verified" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : domain.dnsStatus === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>DNS {domain.dnsStatus || "pending"}</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${domain.ssl ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{domain.ssl ? "SSL active" : "SSL none"}</span>
                          </div>
                          <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Type: </dt><dd className="inline capitalize">{domain.type || "custom"}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Verified: </dt><dd className="inline">{domain.verified ? "Yes" : "No"}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">SSL expiry: </dt><dd className="inline">{formatDate(domain.sslExpiresAt) || ""}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Issuer: </dt><dd className="inline">{domain.sslIssuer || ""}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Last checked: </dt><dd className="inline">{formatDate(domain.lastCheckedAt) || "never"}</dd></div>
                            {(domain.resolvedIps?.length || 0) > 0 && <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">IPs: </dt><dd className="inline font-mono">{domain.resolvedIps.join(", ")}</dd></div>}
                          </dl>
                          {domain.lastError && (
                            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{domain.lastError}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {!domain.isPrimary && (
                            <Button size="small" layout="outline" className="rounded-xl" onClick={async () => { try { setIsSubmitting(true); await StoreServices.updateStoreDomain(id, domain._id, { isPrimary: true }); notifySuccess("Primary domain updated"); await fetchStore({ silent: true }); } catch (e) { notifyError(e?.response?.data?.message || "Unable to set primary"); } finally { setIsSubmitting(false); } }} disabled={isSubmitting}>Set primary</Button>
                          )}
                          <Button size="small" layout="outline" className="rounded-xl font-medium text-blue-700 hover:border-blue-400 hover:bg-blue-50 dark:text-blue-300" onClick={() => handleVerifyDomain(domain._id)} disabled={isSubmitting}>Verify DNS</Button>
                          <Button size="small" layout="outline" className="rounded-xl" onClick={() => { setEditingDomainId(domain._id); setDomainForm({ domain: domain.domain, isPrimary: domain.isPrimary }); setShowDomainModal(true); }}>Edit</Button>
                          <Button size="small" layout="outline" className="rounded-xl font-medium text-red-700 hover:border-red-400 hover:bg-red-50 dark:text-red-300" onClick={() => handleDeleteDomain(domain._id)} disabled={isSubmitting}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showDomainModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingDomainId ? "Edit domain" : "Add domain"}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">DNS and SSL are verified automatically by the platform after saving.</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Domain</label>
                        <input type="text" value={domainForm.domain} onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" placeholder="example.com" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox" checked={domainForm.isPrimary} onChange={(e) => setDomainForm({ ...domainForm, isPrimary: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        Set as primary domain
                      </label>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <Button layout="outline" onClick={() => { setShowDomainModal(false); setEditingDomainId(null); }} disabled={isSubmitting}>Cancel</Button>
                      <Button onClick={handleDomainSubmit} disabled={isSubmitting || !domainForm.domain?.trim()}>
                        {isSubmitting ? "Saving..." : editingDomainId ? "Update" : "Add"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "api" && (
            <>
              <SectionHeader title="API" description="API keys  secrets are hashed and shown only once." action={<Button size="small" className="rounded-xl" onClick={openCreateApiKeyModal}>Create API key</Button>} />
              {tabLoading.api ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : tabError.api ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{tabError.api}</div>
              ) : (tabData.apiKeys?.length || 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No API keys yet. Create one to grant scoped programmatic access.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Name</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Prefix</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Scopes</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Created</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Last used</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Expires</th>
                        <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(tabData.apiKeys || []).map((key) => {
                        const isActive = key.status === "active";
                        const isExpired = key.expiresAt && new Date(key.expiresAt).getTime() < Date.now();
                        return (
                          <tr key={key._id} className="bg-white dark:bg-gray-900">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{key.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{key.prefix}&</td>
                            <td className="px-4 py-3">
                              <div className="flex max-w-[240px] flex-wrap gap-1">
                                {(key.scopes || []).map((scope) => (
                                  <span key={scope} className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{scope}</span>
                                ))}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(key.createdAt)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{formatDate(key.lastUsedAt) || "never"}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-gray-600 dark:text-gray-300">{key.expiresAt ? formatDate(key.expiresAt) : "never"}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${isActive ? (isExpired ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300") : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                                {isActive ? (isExpired ? "expired" : "active") : key.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {isActive && (
                                  <>
                                    <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-300" onClick={() => setConfirmAction({ type: "rotate-api-key", keyId: key._id, keyName: key.name })} disabled={isSubmitting}>Rotate</Button>
                                    <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => handleSetApiKeyExpiry(key._id)} disabled={isSubmitting}>Set expiry</Button>
                                    <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-red-700 hover:border-red-400 hover:bg-red-50 dark:text-red-300" onClick={() => setConfirmAction({ type: "revoke-api-key", keyId: key._id, keyName: key.name })} disabled={isSubmitting}>Revoke</Button>
                                  </>
                                )}
                                {!isActive && <span className="text-xs text-gray-400"></span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {showApiKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create API key</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The secret will be shown once after creation.</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Name *</label>
                        <input type="text" value={apiKeyForm.name} onChange={(e) => setApiKeyForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Mobile app, ERP integration" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Scopes *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {API_KEY_SCOPES.map((scope) => (
                            <label key={scope} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 font-mono text-xs transition ${apiKeyForm.scopes.includes(scope) ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"}`}>
                              <input type="checkbox" checked={apiKeyForm.scopes.includes(scope)} onChange={() => setApiKeyForm((f) => ({ ...f, scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope] }))} className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                              {scope}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Expires in (days)</label>
                        <input type="number" min="1" value={apiKeyForm.expiresInDays} onChange={(e) => setApiKeyForm((f) => ({ ...f, expiresInDays: e.target.value }))} placeholder="Leave empty for no expiration" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <Button layout="outline" onClick={() => setShowApiKeyModal(false)} disabled={isSubmitting}>Cancel</Button>
                      <Button onClick={handleCreateApiKey} disabled={isSubmitting || !apiKeyForm.name.trim() || apiKeyForm.scopes.length === 0}>
                        {isSubmitting ? "Creating..." : "Create API key"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "webhooks" && (
            <>
              <SectionHeader title="Webhooks" description="Outgoing integrations  deliveries are signed and logged with retries." action={<Button size="small" className="rounded-xl" onClick={openCreateWebhookModal}>Create webhook</Button>} />
              {tabLoading.webhooks ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : tabError.webhooks ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{tabError.webhooks}</div>
              ) : (tabData.webhooks?.length || 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No webhooks configured. Create one to receive platform events.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(tabData.webhooks || []).map((webhook) => (
                    <div key={webhook._id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="max-w-[360px] truncate font-mono text-sm font-semibold text-gray-900 dark:text-white">{webhook.url}</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${webhook.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{webhook.status}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(webhook.events || []).map((event) => (
                              <span key={event} className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">{event}</span>
                            ))}
                          </div>
                          <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Last delivery: </dt><dd className="inline">{formatDate(webhook.lastDeliveryAt) || "never"}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Success rate: </dt><dd className="inline">{webhook.successRate === null || webhook.successRate === undefined ? "" : `${webhook.successRate}%`}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Failures: </dt><dd className={`inline ${webhook.failures > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}`}>{formatNumber(webhook.failures)}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Secret: </dt><dd className="inline font-mono">{webhook.secretHint || "configured"}</dd></div>
                          </dl>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => executeTestWebhook(webhook._id)} disabled={isSubmitting}>Test</Button>
                          <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => openDeliveriesModal(webhook)} disabled={isSubmitting}>History</Button>
                          <Button size="small" layout="outline" className={`rounded-xl text-xs font-medium ${webhook.status === "active" ? "text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-300" : "text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 dark:text-emerald-300"}`} onClick={() => executeToggleWebhookStatus(webhook._id, webhook.status === "active" ? "disabled" : "active")} disabled={isSubmitting}>
                            {webhook.status === "active" ? "Disable" : "Enable"}
                          </Button>
                          <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-violet-700 hover:border-violet-400 hover:bg-violet-50 dark:text-violet-300" onClick={() => setConfirmAction({ type: "rotate-webhook-secret", webhookId: webhook._id, webhookUrl: webhook.url })} disabled={isSubmitting}>Rotate secret</Button>
                          <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-red-700 hover:border-red-400 hover:bg-red-50 dark:text-red-300" onClick={() => setConfirmAction({ type: "delete-webhook", webhookId: webhook._id, webhookUrl: webhook.url })} disabled={isSubmitting}>Delete</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showWebhookModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create webhook</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Deliveries are signed with HMAC-SHA256 (X-Sofia-Signature).</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Endpoint URL *</label>
                        <input type="url" value={webhookForm.url} onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://example.com/hooks/sofia" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Event types *</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {WEBHOOK_EVENTS.map((event) => (
                            <label key={event} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 font-mono text-[11px] transition ${webhookForm.events.includes(event) ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300"}`}>
                              <input type="checkbox" checked={webhookForm.events.includes(event)} onChange={() => setWebhookForm((f) => ({ ...f, events: f.events.includes(event) ? f.events.filter((ev) => ev !== event) : [...f.events, event] }))} className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                              {event}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <Button layout="outline" onClick={() => setShowWebhookModal(false)} disabled={isSubmitting}>Cancel</Button>
                      <Button onClick={handleCreateWebhook} disabled={isSubmitting || !webhookForm.url.trim() || webhookForm.events.length === 0}>
                        {isSubmitting ? "Creating..." : "Create webhook"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "backups" && (
            <>
              <SectionHeader title="Backups" description="Async configuration snapshots with checksum verification." action={<Button size="small" className="rounded-xl" onClick={handleBackup} disabled={isSubmitting}>{isSubmitting ? "Queueing..." : "Create backup"}</Button>} />
              {tabLoading.backups ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : tabError.backups ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{tabError.backups}</div>
              ) : (tabData.backups?.length || 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No backups yet. Create one to snapshot this store's configuration.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(tabData.backups || []).map((job) => (
                    <div key={job._id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{job.type} backup</span>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(job.status)}`}>{job.status}</span>
                          </div>
                          <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2 xl:grid-cols-4">
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Created: </dt><dd className="inline">{formatDate(job.createdAt)}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Size: </dt><dd className="inline">{job.size ? `${formatNumber(Math.round(job.size / 1024))} KB` : ""}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Storage: </dt><dd className="inline">{job.storage || "local"}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Retention: </dt><dd className="inline">{job.retentionDays ?? 30} days  expires {formatDate(job.expiresAt)}</dd></div>
                            <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Encryption: </dt><dd className="inline">{job.encrypted ? "Yes" : "No"}</dd></div>
                            {job.completedAt && <div><dt className="inline font-medium text-gray-600 dark:text-gray-300">Completed: </dt><dd className="inline">{formatDate(job.completedAt)}</dd></div>}
                          </dl>
                        </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                              {job.status === "completed" && (
                                <>
                                  <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={async () => { try { setIsSubmitting(true); const result = await StoreServices.verifyStoreBackup(id, job._id); if (result.valid) notifySuccess("Checksum verified"); else notifyError(`Verification failed: ${result.reason || "mismatch"}`); } catch (e) { notifyError("Unable to verify"); } finally { setIsSubmitting(false); } }} disabled={isSubmitting}>Verify</Button>
                                  <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => handleDownloadBackup(job._id)} disabled={isSubmitting}>Download</Button>
                                  <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-amber-700 hover:border-amber-400 hover:bg-amber-50 dark:text-amber-300" onClick={() => setConfirmAction({ type: "restore-backup", jobId: job._id, backupDate: job.createdAt })} disabled={isSubmitting}>Restore</Button>
                                </>
                              )}
                              <Button size="small" layout="outline" className="rounded-xl text-xs font-medium text-red-700 hover:border-red-400 hover:bg-red-50 dark:text-red-300" onClick={() => setConfirmAction({ type: "delete-backup", jobId: job._id, backupType: job.type, backupDate: job.createdAt })} disabled={isSubmitting}>Delete</Button>
                            </div>
                      </div>
                      {(job.status === "queued" || job.status === "running") && (
                        <div className="mt-3">
                          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={`h-full rounded-full transition-all ${job.status === "queued" ? "w-[5%] bg-slate-400" : "bg-emerald-500"}`} style={{ width: job.status === "queued" ? undefined : `${job.progress || 0}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{job.status === "queued" ? "Queued&" : `Running& ${job.progress || 0}%`}</p>
                        </div>
                      )}
                      {job.status === "failed" && job.error && (
                         <p className="truncate mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{job.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "logs" && (
            <>
              <SectionHeader title="Logs" description="Technical machine events  webhooks, jobs and authentication. Who-did-what lives in the Audit tab." />
              <div className="mb-4 flex flex-wrap gap-2">
                {[["all", "All"], ["webhooks", "Webhooks"], ["jobs", "Jobs"], ["auth", "Authentication"]].map(([key, label]) => (
                  <Button key={key} size="small" layout={systemLogsService === key ? undefined : "outline"} className={`rounded-xl ${systemLogsService === key ? "" : "text-gray-600 dark:text-gray-300"}`} onClick={() => setSystemLogsService(key)} disabled={systemLogsLoading}>
                    {label}
                  </Button>
                ))}
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Timestamp</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Level</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Service</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Message</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Request ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {systemLogsLoading ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></td></tr>
                    ) : systemLogsRows.length === 0 ? (
                      <tr className="bg-white dark:bg-gray-900"><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No technical logs for this filter. API/System request logging is not instrumented yet.</td></tr>
                    ) : (
                      systemLogsRows.map((entry) => (
                        <tr key={entry._id} className="bg-white dark:bg-gray-900">
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-gray-900 dark:text-white">{formatDate(entry.ts)}</div>
                            <div className="text-xs text-gray-400">{new Date(entry.ts).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${entry.level === "error" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" : entry.level === "warn" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"}`}>{entry.level}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200">{entry.service}</td>
                          <td className="max-w-[420px] px-4 py-3">
                            <div className="truncate text-gray-800 dark:text-gray-100">{entry.message}</div>
                            {entry.meta && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{entry.meta}</div>}
                          </td>
                          <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[10px] text-gray-400">{entry.requestId || ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "audit" && (
            <>
              <SectionHeader title="Audit trail" description="Who did what: critical actions and changes on this store." action={<Button size="small" className="rounded-xl" onClick={handleExportAudit} disabled={isSubmitting}>Export</Button>} />

              <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <input type="text" value={auditDraft.action} onChange={(e) => setAuditDraft((f) => ({ ...f, action: e.target.value }))} placeholder="Action&" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  <input type="text" value={auditDraft.module} onChange={(e) => setAuditDraft((f) => ({ ...f, module: e.target.value }))} placeholder="Resource / module&" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  <select value={auditDraft.severity} onChange={(e) => setAuditDraft((f) => ({ ...f, severity: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    <option value="">All severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <select value={auditDraft.status} onChange={(e) => setAuditDraft((f) => ({ ...f, status: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    <option value="">All statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                  </select>
                  <input type="date" value={auditDraft.dateFrom} onChange={(e) => setAuditDraft((f) => ({ ...f, dateFrom: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  <input type="date" value={auditDraft.dateTo} onChange={(e) => setAuditDraft((f) => ({ ...f, dateTo: e.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="small" layout="outline" className="rounded-xl" onClick={() => { const cleared = { action: "", module: "", severity: "", status: "", dateFrom: "", dateTo: "" }; setAuditDraft(cleared); setAuditFilters(cleared); setAuditPage(1); }}>Reset</Button>
                  <Button size="small" className="rounded-xl" onClick={() => { setAuditPage(1); setAuditFilters({ ...auditDraft }); }} disabled={isSubmitting || auditLoading}>Apply filters</Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Timestamp</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Actor</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Action</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Resource</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Old  New</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">IP</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Request ID</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Severity</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {auditLoading ? (
                      <tr><td colSpan={9} className="px-4 py-10 text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></td></tr>
                    ) : auditRows.length === 0 ? (
                      <tr className="bg-white dark:bg-gray-900"><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No audit entries match these filters.</td></tr>
                    ) : (
                      auditRows.map((entry) => {
                        const isCritical = AUDIT_CRITICAL_ACTIONS.some((criticalAction) => String(entry.action || "").startsWith(criticalAction)) || entry.severity === "critical";
                        const ip = entry.ip || entry.sourceIp || entry.ipAddress || "";
                        return (
                          <tr key={entry._id} className={`${isCritical ? "bg-amber-50/70 dark:bg-amber-950/20" : "bg-white"} dark:bg-gray-900`}>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="text-gray-900 dark:text-white">{formatDate(entry.createdAt)}</div>
                              <div className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 dark:text-white">{entry.actorNameSnapshot || entry.actorType}</div>
                              <div className="text-xs capitalize text-gray-400">{String(entry.actorType || "").replace("_", " ")}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{entry.action}</span>
                                {isCritical && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:bg-red-900/30 dark:text-red-300">!</span>}
                              </div>
                              {entry.summary && <div className="mt-0.5 max-w-[260px] truncate text-xs text-gray-500 dark:text-gray-400">{entry.summary}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              <div>{entry.entityType || entry.module || ""}</div>
                              {entry.entityId && <div className="font-mono text-[10px] text-gray-400">{String(entry.entityId).slice(-8)}</div>}
                            </td>
                            <td className="max-w-[220px] px-4 py-3">
                              {(entry.oldValue === undefined || entry.oldValue === null) && (entry.newValue === undefined || entry.newValue === null) ? (
                                <span className="text-gray-400"></span>
                              ) : (
                                <div className="space-y-0.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                                  {entry.oldValue !== undefined && entry.oldValue !== null && <div className="truncate line-through">{JSON.stringify(entry.oldValue).slice(0, 60)}</div>}
                                  {entry.newValue !== undefined && entry.newValue !== null && <div className="truncate">{JSON.stringify(entry.newValue).slice(0, 60)}</div>}
                                </div>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{ip || ""}</td>
                            <td className="max-w-[120px] truncate px-4 py-3 font-mono text-[10px] text-gray-400">{entry.requestId || ""}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${entry.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" : entry.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" : entry.severity === "medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{entry.severity}</span>
                            </td>
                            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(entry.status)}`}>{entry.status}</span></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {auditPagination && auditPagination.total > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Page {auditPagination.page} of {auditPagination.pages}  {formatNumber(auditPagination.total)} entries</span>
                  <div className="flex gap-2">
                    <Button size="small" layout="outline" className="rounded-xl" onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage <= 1 || auditLoading}>Previous</Button>
                    <Button size="small" layout="outline" className="rounded-xl" onClick={() => setAuditPage((p) => (auditPagination && p < auditPagination.pages ? p + 1 : p))} disabled={!auditPagination || auditPage >= auditPagination.pages || auditLoading}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "security" && (
            <>
              <SectionHeader title="Security" description="Transparent security status with explicit reasons  no artificial score." />
              {tabLoading.security ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : tabError.security ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{tabError.security}</div>
              ) : (() => {
                const security = tabData.security || {};
                const sections = security.sections || {};
                const auth = sections.authentication || {};
                const access = sections.access || {};
                const infra = sections.infrastructure || {};
                const domains = infra.domains || {};
                const apiKeysInfo = infra.apiKeys || {};
                const webhooksInfo = infra.webhooks || {};
                const reasons = security.reasons || [];
                const events = security.recentEvents || [];
                const statusMeta = {
                  good: { emoji: "=", label: "Good", banner: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30", text: "text-emerald-800 dark:text-emerald-200" },
                  attention: { emoji: "=", label: "Attention", banner: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30", text: "text-amber-800 dark:text-amber-200" },
                  critical: { emoji: "=4", label: "Critical", banner: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30", text: "text-red-800 dark:text-red-200" },
                }[security.status || "good"] || {};
                const reasonIcon = { good: "=", attention: "=", critical: "=4" };
                const severityBadge = (severityValue) => severityValue === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300" : severityValue === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
                return (
                  <div className="space-y-6">
                    <div className={`rounded-2xl border p-5 ${statusMeta.banner}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{statusMeta.emoji}</span>
                        <div>
                          <h3 className={`text-xl font-bold ${statusMeta.text}`}>Security status: {statusMeta.label}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{reasons.length} check(s) evaluated from live data.</p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {reasons.map((reason, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="shrink-0">{reasonIcon[reason.level] || "\u2022"}</span>
                            <span>{reason.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Authentication</h4>
                        <div className="mt-3 space-y-2">
                          <SmallStatList entries={[
                            { label: "Owner 2FA", value: auth.ownerTwoFactor ? "Enabled" : "Disabled" },
                            { label: "Staff with 2FA", value: `${auth.staffWith2FA ?? 0} / ${auth.staffTotal ?? 0}` },
                            { label: "Failed logins (30d)", value: formatNumber(auth.failedLogins30d ?? 0) },
                            { label: "Locked / suspended members", value: formatNumber(access.suspendedMemberships ?? 0) },
                          ]} />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Access</h4>
                        <div className="mt-3 space-y-2">
                          <SmallStatList entries={[{ label: "Active admins", value: formatNumber(access.activeAdmins ?? 0) }, { label: "Suspended memberships", value: formatNumber(access.suspendedMemberships ?? 0) }]} />
                          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Roles in use</div>
                            <div className="flex flex-wrap gap-1.5">
                              {(access.roles || []).length === 0 ? (
                                <span className="text-xs text-gray-400">No active members.</span>
                              ) : access.roles.map((role) => (
                                <span key={role.name} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${role.privileged ? "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                                  {role.name} {role.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Infrastructure</h4>
                        <div className="mt-3 space-y-2">
                          <SmallStatList entries={[
                            { label: "Domains verified", value: `${domains.verified ?? 0} / ${domains.total ?? 0}` },
                            { label: "SSL active / expired", value: `${domains.sslActive ?? 0} / ${domains.sslExpired ?? 0}` },
                            { label: "API keys active / revoked", value: `${apiKeysInfo.active ?? 0} / ${apiKeysInfo.revoked ?? 0}${(apiKeysInfo.expiredStillActive || 0) > 0 ? `   ${apiKeysInfo.expiredStillActive} expired` : ""}` },
                            { label: "Webhooks active / total", value: `${webhooksInfo.active ?? 0} / ${webhooksInfo.total ?? 0}` },
                          ]} />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Security events</h4>
                        <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                          {events.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No security-relevant events recorded.</p>
                          ) : events.map((event) => (
                            <div key={event._id} className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">{event.action}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${severityBadge(event.severity)}`}>{event.severity}</span>
                              </div>
                              {event.summary && <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{event.summary}</p>}
                              <p className="mt-0.5 text-[10px] text-gray-400">{formatDate(event.createdAt)}  {event.actorNameSnapshot || "system"}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeTab === "maintenance" && (
            <>
              <SectionHeader title="Maintenance" description="Store-scoped maintenance mode. Platform operations live in platform administration." />
              {tabLoading.maintenance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : tabError.maintenance ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">{tabError.maintenance}</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Store maintenance mode</h4>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Last updated {formatDate(tabData.maintenance?.updatedAt)}.</p>
                      <div className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 ${maintenanceForm.enabled ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"}`}>
                        <span className="text-sm text-gray-600 dark:text-gray-300">Enable maintenance mode</span>
                        <SwitchToggle handleProcess={(value) => setMaintenanceForm((f) => ({ ...f, enabled: Boolean(value) }))} processOption={maintenanceForm.enabled} />
                      </div>
                      <label className="mb-1 mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-500">Visitor message</label>
                      <textarea value={maintenanceForm.message} onChange={(e) => setMaintenanceForm((f) => ({ ...f, message: e.target.value }))} rows={2} maxLength={500} placeholder="We'll be back shortly&" className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                      <div className="mt-4 flex justify-end">
                        <Button size="small" onClick={handleSaveMaintenance} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl">
                          <FiSave size={14} /> {isSubmitting ? "Saving..." : "Save maintenance"}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Health checks</h4>
                      <div className="mt-3 space-y-2">
                        <SmallStatList entries={[
                          { label: "Domains DNS verified", value: `${(store.domains || []).filter((d) => d.verified).length} / ${(store.domains || []).length}` },
                          { label: "SSL active", value: formatNumber((store.domains || []).filter((d) => d.ssl).length) },
                          { label: "Storefront status", value: store.isActive ? "Live" : "Hidden" },
                        ]} />
                      </div>
                      <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                        Cache, queues, workers, indexes and jobs are PLATFORM operations  manage them from the platform administration area, not from this store.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && (
            <>
              <SectionHeader title="Settings" description="Grouped store settings  each group is validated and saved independently." />
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">General</h4>
                  <div className="mt-4 grid gap-5 xl:grid-cols-2">
                    <div><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Store name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                    <div><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Category</label><input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                    <div className="xl:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                    <div className="xl:col-span-2"><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Logo</label><ImageUploader imageUrl={imageUrl} setImageUrl={setImageUrl} /></div>
                  </div>
                  <div className="mt-4 flex justify-end"><Button size="small" onClick={handleSaveGeneralGroup} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl"><FiSave size={14} /> {isSubmitting ? "Saving..." : "Save general"}</Button></div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Web addresses</h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Slug is managed by the platform. DNS/SSL of custom domains is verified automatically in the Domains tab.</p>
                  <div className="mt-4 grid gap-5 xl:grid-cols-3">
                    <div><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Subdomain</label><input type="text" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                    <div><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Domain</label><input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                    <div><label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">Custom domain</label><input type="text" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" /></div>
                  </div>
                  <div className="mt-4 flex justify-end"><Button size="small" layout="outline" onClick={handleSaveAddressesGroup} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl"><FiSave size={14} /> {isSubmitting ? "Saving..." : "Save addresses"}</Button></div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white">Reviews</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[["enabled","Enable reviews"],["requireApproval","Require approval"],["verifiedOwnersOnly","Verified owners only"],["allowGuestReviews","Allow guest reviews"],["showRating","Show rating"],["showCount","Show count"]].map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                        <SwitchToggle handleProcess={(value) => setReviewSettingsForm((f) => ({ ...f, [key]: Boolean(value) }))} processOption={Boolean(reviewSettingsForm[key])} />
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Max images per review</span>
                      <input type="number" min="0" value={reviewSettingsForm.maxImages} onChange={(e) => setReviewSettingsForm((f) => ({ ...f, maxImages: e.target.value }))} className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-right text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end"><Button size="small" layout="outline" onClick={handleSaveReviewsGroup} disabled={isSubmitting} className="flex items-center gap-2 rounded-xl"><FiSave size={14} /> {isSubmitting ? "Saving..." : "Save reviews"}</Button></div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                  Plan, billing cycle, storefront visibility and suspension are managed from their dedicated tabs and header actions  they are intentionally not editable here.
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </AnimatedContent>

      <ConfirmActionModal
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        isSubmitting={isSubmitting}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={async () => {
          if (!confirmAction) return;
          if (confirmAction.type === "pause-subscription") {
            await executePauseSubscription();
            return;
          }
          if (confirmAction.type === "block-owner") {
            await executeSetOwnerBlock(true);
            return;
          }
          if (confirmAction.type === "unblock-owner") {
            await executeSetOwnerBlock(false);
            return;
          }
          if (confirmAction.type === "revoke-owner-sessions") {
            await executeRevokeOwnerSessions();
            return;
          }
          if (confirmAction.type === "remove-staff") {
            await executeRemoveStaff(confirmAction.userId);
            return;
          }
          if (confirmAction.type === "refund-payment") {
            await executeRefundPayment(confirmAction.row);
            return;
          }
          if (confirmAction.type === "retry-billing") {
            await executeRetryBillingPayment();
            return;
          }
          if (confirmAction.type === "rotate-api-key") {
            await executeRotateApiKey(confirmAction.keyId);
            return;
          }
          if (confirmAction.type === "revoke-api-key") {
            await executeRevokeApiKey(confirmAction.keyId);
            return;
          }
          if (confirmAction.type === "delete-webhook") {
            await executeDeleteWebhook(confirmAction.webhookId);
            return;
          }
          if (confirmAction.type === "delete-backup") {
            await executeDeleteBackup(confirmAction.jobId);
            return;
          }
          if (confirmAction.type === "login-as-owner") {
            await executeLoginAsOwner();
            return;
          }
          if (confirmAction.type === "restore-backup") {
            await executeRestoreBackup(confirmAction.jobId);
            return;
          }
          try {
            setIsSubmitting(true);
            await handleQuickAction(confirmAction.type);
          } catch (e) {
            notifyError(e?.response?.data?.message || "The requested action could not be completed");
          } finally {
            setIsSubmitting(false);
            setConfirmAction(null);
          }
        }}
      />
      {planModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {planModalMode === "downgrade" ? "Downgrade subscription" : "Upgrade subscription"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a target plan for {store.name}.</p>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {upgradeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : upgradePlans.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No plans available.</p>
              ) : (
                upgradePlans.map((planOption) => (
                  <label
                    key={planOption._id || planOption.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                      selectedPlanId === (planOption._id || planOption.id)
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{planOption.name || planOption.planName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{planOption.slug || planOption.planSlug}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {planOption.pricing?.monthly !== undefined && planOption.pricing?.monthly !== null ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(planOption.pricing.monthly, planOption.pricing.currency)}/mo</span>
                      ) : null}
                      <input
                        type="radio"
                        name="targetPlan"
                        value={planOption._id || planOption.id}
                        checked={selectedPlanId === (planOption._id || planOption.id)}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button layout="outline" onClick={() => setPlanModalMode(null)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handlePlanSubmit} disabled={isSubmitting || !selectedPlanId}>
                {isSubmitting
                  ? planModalMode === "downgrade" ? "Downgrading..." : "Upgrading..."
                  : planModalMode === "downgrade" ? "Downgrade" : "Upgrade"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {invoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoice</h3>
            {invoiceDetailLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : invoiceDetail ? (
              <div className="mt-3 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">{invoiceDetail.invoiceNumber}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(invoiceDetail.status)}`}>{invoiceDetail.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Issued: <span className="font-medium">{formatDate(invoiceDetail.issuedAt)}</span></div>
                  <div>Due: <span className="font-medium">{formatDate(invoiceDetail.dueDate)}</span></div>
                  <div>Paid: <span className="font-medium">{formatDate(invoiceDetail.paidAt)}</span></div>
                  <div>Currency: <span className="font-medium uppercase">{invoiceDetail.currency || ""}</span></div>
                </div>
                {(invoiceDetail.items?.length || 0) > 0 && (
                  <table className="min-w-full divide-y divide-gray-200 rounded-xl border border-gray-200 text-xs dark:divide-gray-700 dark:border-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Unit</th>
                        <th className="px-3 py-2 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {invoiceDetail.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2">{item.description}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice, invoiceDetail.currency)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total, invoiceDetail.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="space-y-1 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(invoiceDetail.subtotal, invoiceDetail.currency)}</span></div>
                  <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(invoiceDetail.tax, invoiceDetail.currency)}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white"><span>Total</span><span>{formatCurrency(invoiceDetail.total, invoiceDetail.currency)}</span></div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No details available.</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              {invoiceDetail?._id && (
                <Button layout="outline" onClick={() => handleDownloadInvoicePdf(invoiceDetail._id, invoiceDetail.invoiceNumber)} disabled={isSubmitting}>Download PDF</Button>
              )}
              <Button onClick={() => setInvoiceModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {openPaymentRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpenPaymentRow(null)}>
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold capitalize text-gray-900 dark:text-white">{openPaymentRow.type} details</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between"><span>Date</span><span>{formatDate(openPaymentRow.date)}</span></div>
              <div className="flex justify-between"><span>Amount</span><span className="font-medium text-gray-900 dark:text-white">{formatCurrency(openPaymentRow.amount, openPaymentRow.currency)}</span></div>
              <div className="flex justify-between"><span>Status</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(openPaymentRow.status)}`}>{openPaymentRow.status}</span></div>
              <div className="flex justify-between"><span>Method</span><span className="capitalize">{openPaymentRow.method || ""}</span></div>
              <div className="flex justify-between"><span>Provider</span><span>{openPaymentRow.provider || ""}</span></div>
              <div className="flex justify-between gap-3"><span>Transaction ID</span><span className="truncate font-mono text-xs">{openPaymentRow.transactionId || ""}</span></div>
              {openPaymentRow.failureReason && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">Failure reason: {openPaymentRow.failureReason}</div>}
              {Number(openPaymentRow.refundedAmount) > 0 && <div className="flex justify-between"><span>Refunded</span><span>{formatCurrency(openPaymentRow.refundedAmount, openPaymentRow.currency)}</span></div>}
              {openPaymentRow.attemptCount > 1 && <div className="flex justify-between"><span>Attempts</span><span>{openPaymentRow.attemptCount}{openPaymentRow.nextRetryAt ? `  next retry ${formatDate(openPaymentRow.nextRetryAt)}` : ""}</span></div>}
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setOpenPaymentRow(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {loginHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Login history</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recent sign-in activity for {store.owner?.name || store.owner?.email || "the store owner"}.</p>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {loginHistoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : loginHistoryData.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/60">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No login history recorded.</p>
                </div>
              ) : (
                loginHistoryData.map((entry, index) => (
                  <div key={entry._id || index} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{formatDate(entry.loginAt || entry.createdAt)}</div>
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">{[entry.browser, entry.os, entry.device].filter(Boolean).join(" \u2022 ") || "Unknown device"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(entry.status)}`}>{entry.status || "Unknown"}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{entry.ipAddress || ""}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button layout="outline" onClick={() => setLoginHistoryModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer ownership</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Search and select the new owner of {store.name}.</p>
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
              <div className="text-xs uppercase tracking-wide text-violet-600 dark:text-violet-300">Current owner</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">{(store.owner?.name || store.owner?.email || "?").charAt(0).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{store.owner?.name || ""}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{store.owner?.email}</span>
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">The current owner will lose ownership of this store.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Search users</label>
                <input
                  type="text"
                  value={transferSearch}
                  onChange={(e) => {
                    setTransferSearch(e.target.value);
                    setSelectedNewOwner(null);
                  }}
                  placeholder="Name or email (min. 2 characters)"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl">
                {transferLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  </div>
                ) : transferResults.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
                    {transferSearch.trim().length < 2 ? "Type at least 2 characters to search." : "No users found."}
                  </p>
                ) : (
                  transferResults.map((userResult) => {
                    const isSelected = selectedNewOwner?._id === userResult._id;
                    return (
                      <Button
                        key={userResult._id}
                        type="button"
                        onClick={() => setSelectedNewOwner(userResult)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${isSelected ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"}`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">{(userResult.name || userResult.email || "?").charAt(0).toUpperCase()}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{userResult.name || userResult.email}</span>
                          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{userResult.email}</span>
                        </span>
                        {userResult.status && (
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(userResult.status)}`}>{userResult.status}</span>
                        )}
                      </Button>
                    );
                  })
                )}
              </div>
              {selectedNewOwner && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  New owner: <span className="font-semibold">{selectedNewOwner.name || selectedNewOwner.email}</span> ({selectedNewOwner.email})
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button layout="outline" onClick={() => setShowTransferModal(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleTransferSubmit} disabled={isSubmitting || !selectedNewOwner}>
                {isSubmitting ? "Transferring..." : "Transfer ownership"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {deliveriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery history</h3>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">{deliveriesModal.url}</p>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs dark:divide-gray-700">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/90">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Event</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Timestamp</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">HTTP</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Duration</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Attempts</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Status</th>
                    <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Response</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveriesLoading ? (
                    <tr><td colSpan={8} className="px-3 py-8 text-center"><div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></td></tr>
                  ) : deliveriesData.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">No deliveries recorded yet.</td></tr>
                  ) : (
                    deliveriesData.map((delivery) => (
                      <tr key={delivery._id} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-2 font-mono">{delivery.event}</td>
                        <td className="whitespace-nowrap px-3 py-2">{formatDate(delivery.createdAt)}</td>
                        <td className="px-3 py-2">{delivery.httpStatus || ""}</td>
                        <td className="px-3 py-2">{delivery.durationMs !== null && delivery.durationMs !== undefined ? `${formatNumber(delivery.durationMs)} ms` : ""}</td>
                        <td className="px-3 py-2">{delivery.attempt || 1}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${getStatusClasses(delivery.status)}`}>{delivery.status}</span></td>
                        <td className="max-w-[180px] truncate px-3 py-2 text-gray-500 dark:text-gray-400">{delivery.error || delivery.responseSnippet || ""}</td>
                        <td className="px-3 py-2 text-right">
                          {delivery.status !== "success" && (
                            <Button size="small" layout="outline" className="rounded-xl text-xs" onClick={() => handleRetryDelivery(delivery._id)} disabled={isSubmitting}>Retry</Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" onClick={() => setDeliveriesModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {revealedSecret && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{revealedSecret.title}</h3>
            <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">Copy this secret now  it will never be shown again.</p>
            <div className="mt-3 break-all rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 font-mono text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-emerald-300">{revealedSecret.secret}</div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                layout="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(revealedSecret.secret);
                    notifySuccess("Secret copied to clipboard");
                  } catch (e) {
                    notifyError("Unable to copy  select the secret manually");
                  }
                }}
              >
                Copy
              </Button>
              <Button onClick={() => setRevealedSecret(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
      <PromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onConfirm={handlePromptConfirm}
        title={promptConfig.title}
        message={promptConfig.message}
        placeholder={promptConfig.placeholder}
        defaultValue={promptConfig.defaultValue}
        confirmLabel="Confirm"
      />
    </>
  );
};

export default StoreDetail;
