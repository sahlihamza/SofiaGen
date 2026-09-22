
import { Link, useHistory } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiArchive, FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown, FiFilter, FiPlus, FiSearch, FiGlobe, FiTool } from "react-icons/fi";

import { SidebarContext } from "@/context/SidebarContext";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import StoreDrawer from "@/components/drawer/StoreDrawer";
import AnimatedContent from "@/components/common/AnimatedContent";
import TableLoading from "@/components/preloader/TableLoading";
import useAsync from "@/hooks/useAsync";
import StoreServices from "@/services/StoreServices";
import { notifySuccess, notifyError } from "@/utils/toast";
import { getLogoUrl } from "@/utils/getLogoUrl";
import ActionMenu from "@/components/table/ActionMenu";
import { useStoreContext } from "@/context/StoreContext";
import { Button } from "@sofia/ui";

const COLORS = [
  "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

const statusOptions = [
  { value: "", label: "StatusLabel" },
  { value: "active", label: "ActiveStatus" },
  { value: "suspended", label: "SuspendedStatus" },
  { value: "inactive", label: "InactiveStatus" },
];
const planOptions = [
  { value: "", label: "PlanLabel" },
  { value: "basic", label: "BasicPlan" },
  { value: "pro", label: "ProPlan" },
  { value: "enterprise", label: "EnterprisePlan" },
];

const getColor = (id) => {
  const index = Number.parseInt(id?.slice(-1), 16) % COLORS.length;
  return COLORS[index] || COLORS[0];
};

const formatDate = (value) => {
  if (!value) return "â€”";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (value) => {
  if (value == null) return "â€”";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const compareValues = (va, vb) => {
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
};

const comparators = {
  store: (a, b) => compareValues(String(a.name || "").toLowerCase(), String(b.name || "").toLowerCase()),
  owner: (a, b) => compareValues(String(a.ownerName || a.ownerId?.name || a.owner || "").toLowerCase(), String(b.ownerName || b.ownerId?.name || b.owner || "").toLowerCase()),
  plan: (a, b) => compareValues(String(a.plan || "Basic").toLowerCase(), String(b.plan || "Basic").toLowerCase()),
  revenue: (a, b) => Number(a.revenue || 0) - Number(b.revenue || 0),
  status: (a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0),
  lastActivity: (a, b) => new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime(),
};

const getSortComparator = (sortField) => comparators[sortField] || null;

const useFilteredStores = (storeList, searchTerm, statusFilter, planFilter, categoryFilter) => {
  return useMemo(() => {
    if (!storeList) return [];

    return storeList.filter((store) => {
      const matchesText = [store.name, store.ownerId?.name, store.owner, store.ownerName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter) {
        matchesStatus = statusFilter === "active" ? store.isActive : !store.isActive;
      }

      const planValue = String(store.plan || store.planSlug || store.planName || "");
      const matchesPlan = planFilter ? planValue === planFilter : true;
      const matchesCategory = categoryFilter ? String(store.category || "") === categoryFilter : true;

      return matchesText && matchesStatus && matchesPlan && matchesCategory;
    });
  }, [storeList, searchTerm, statusFilter, planFilter, categoryFilter]);
};

const useSortedStores = (filtered, sortField, sortDirection) => {
  return useMemo(() => {
    const list = (filtered || []).slice();
    const compare = getSortComparator(sortField);
    if (!compare) {
      return list;
    }

    list.sort(compare);
    if (sortDirection === "desc") {
      list.reverse();
    }

    return list;
  }, [filtered, sortField, sortDirection]);
};

const Stores = () => {
  const { t } = useTranslation();
  const { toggleDrawer, setIsUpdate } = useContext(SidebarContext);
  const { serviceId, setServiceId, handleModalOpen } = useToggleDrawer();
  const { data: stores, loading, error } = useAsync(StoreServices.getAllStores);
  const { selectStore } = useStoreContext() || {};
  const history = useHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [drawerKey, setDrawerKey] = useState(0);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [pendingStore, setPendingStore] = useState(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isArchiveProcessing, setIsArchiveProcessing] = useState(false);
  const pageSize = 10;

  // normalize API response: some endpoints return array directly, others
  // return an object like { stores: [...] } or { data: [...] }
  const storeList = useMemo(() => {
    const raw = Array.isArray(stores) ? stores : stores?.stores || stores?.data || [];
    return raw.filter((store) => store.status !== "deleted");
  }, [stores]);

  const planOptions = useMemo(() => {
    const planMap = new Map();

    (storeList || []).forEach((store) => {
      const value = String(store.plan || store.planSlug || store.planName || "").trim();
      if (!value) return;
      const label = store.planName || value;
      if (!planMap.has(value)) {
        planMap.set(value, label);
      }
    });

    const sortedPlans = Array.from(planMap.entries()).sort(([, aLabel], [, bLabel]) =>
      aLabel.localeCompare(bLabel, undefined, { sensitivity: "base" })
    );

    return [
      { value: "", label: t("PlanLabel") },
      ...sortedPlans.map(([value, label]) => ({ value, label })),
    ];
  }, [storeList, t]);

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        (storeList || [])
          .map((store) => String(store.category || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    return [
      { value: "", label: "CategoryLabel" },
      ...categories.map((category) => ({ value: category, label: category })),
    ];
  }, [storeList]);

  const summary = useMemo(() => {
    const total = storeList?.length || 0;
    const active = storeList?.filter((item) => item.isActive).length || 0;
    const inactive = total - active;
    const totalRevenue = storeList?.reduce((sum, item) => sum + Number(item.revenue || 0), 0) || 0;
    return { total, active, inactive, totalRevenue };
  }, [storeList]);

  const handleOpenAddDrawer = () => {
    setServiceId(undefined);
    setDrawerKey((prev) => prev + 1);
    toggleDrawer();
  };

  const handleEditStore = (id) => {
    setServiceId(id);
    setDrawerKey((prev) => prev + 1);
    setIsUpdate(true);
    toggleDrawer();
  };

  const handleToggleStoreActive = async (id, isActive) => {
    try {
      await StoreServices.updateStoreStatus(id, isActive);
      setIsUpdate(true);
      notifySuccess(isActive ? t("StoreUnarchived") : t("StoreArchived"));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleArchiveClick = (store) => {
    setPendingStore(store);
    setIsArchiveConfirmOpen(true);
  };

  const getStorePublicUrl = (store) => {
    if (!store) return null;
    if (store.customDomain) {
      return `https://${store.customDomain}/`;
    }
    const baseUrl = import.meta.env.VITE_STOREFRONT_URL || "http://localhost:3000";
    return `${baseUrl}/storefront/${store._id}`;
  };

  const handleViewStorefront = (store) => {
    const url = getStorePublicUrl(store);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleManageStore = async (store) => {
    try {
      await selectStore(store._id);
      notifySuccess(t("StoreSelected") || "Store selected");
      history.push("/dashboard");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to select store");
    }
  };

  const handleConfirmArchiveChange = async () => {
    if (!pendingStore) return;
    setIsArchiveProcessing(true);
    try {
      await handleToggleStoreActive(pendingStore._id, !pendingStore.isActive);
    } finally {
      setIsArchiveProcessing(false);
      setIsArchiveConfirmOpen(false);
      setPendingStore(null);
    }
  };

  const filtered = useFilteredStores(storeList, searchTerm, statusFilter, planFilter, categoryFilter);
  const sortedStores = useSortedStores(filtered, sortField, sortDirection);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const displayedStores = sortedStores?.slice((page - 1) * pageSize, page * pageSize) || [];

  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));

  let storeSection = null;
  if (loading) {
    storeSection = <TableLoading row={4} col={3} width={160} height={20} />;
  } else if (error) {
    storeSection = (
      <div className="rounded-[28px] border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-8 text-center text-red-700">
        <p>{error?.response?.data?.message || error?.message || String(error)}</p>
      </div>
    );
  } else if (filtered?.length === 0) {
    storeSection = (
      <div className="rounded-[28px] border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800">
          <FiSearch size={28} className="text-gray-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t("NoStoresFound")}</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("NoStoresFoundDescription")}</p>
        <Button onClick={handleOpenAddDrawer} className="mt-6 rounded-2xl px-6 py-3">
          <FiPlus size={16} /> {t("AddStore")}
        </Button>
      </div>
    );
  } else {
    storeSection = (
      <div className="overflow-x-auto rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "store" ? f : "store"));
                  setSortDirection((d) => (sortField === "store" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("StoreLabel")} {sortField === "store" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "owner" ? f : "owner"));
                  setSortDirection((d) => (sortField === "owner" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("OwnerLabel")} {sortField === "owner" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "plan" ? f : "plan"));
                  setSortDirection((d) => (sortField === "plan" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("PlanLabel")} {sortField === "plan" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "revenue" ? f : "revenue"));
                  setSortDirection((d) => (sortField === "revenue" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("RevenueLabel")} {sortField === "revenue" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "status" ? f : "status"));
                  setSortDirection((d) => (sortField === "status" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("StatusLabel")} {sortField === "status" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th
                onClick={() => {
                  setPage(1);
                  setSortField((f) => (f === "lastActivity" ? f : "lastActivity"));
                  setSortDirection((d) => (sortField === "lastActivity" && d === "asc" ? "desc" : "asc"));
                }}
                className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400 cursor-pointer select-none"
              >
                {t("LastActivityLabel")} {sortField === "lastActivity" && (sortDirection === "asc" ? <FiChevronUp className="inline-block" /> : <FiChevronDown className="inline-block" />)}
              </th>
              <th className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {displayedStores.map((store) => {
              const owner = store.ownerId?.name || store.owner?.name || store.ownerName || t("AdminTeam");
              const plan = store.plan || "Basic";
              const revenue = store.revenue != null ? formatCurrency(store.revenue) : "â€”";
              const lastActivity = formatDate(store.updatedAt || store.createdAt);

              return (
                <tr key={store._id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                        style={{ backgroundColor: `${getColor(store._id)}20` }}
                      >
                        {store.logo ? (
                          <img
                            src={getLogoUrl(store.logo)}
                            alt={store.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-sm font-semibold" style={{ color: getColor(store._id) }}>
                            {store.name?.charAt(0)?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/stores/${store._id}`}
                          className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {store.name}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{store.address || t("NoAddress")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200">{owner?.charAt(0)}</div>
                      <span className="text-sm text-gray-900 dark:text-white">{owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400">{plan.toUpperCase()}</td>
                  <td className="px-6 py-5 text-right text-sm text-gray-900 dark:text-white">{revenue}</td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold ${store.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-error-container text-on-error-container border border-error/20"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${store.isActive ? "bg-emerald-600" : "bg-error"}`} />
                      {t(store.isActive ? "ActiveStatus" : "SuspendedStatus")}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400">{lastActivity}</td>
                  <td className="px-6 py-5 text-right">
                    <ActionMenu
                      id={store._id}
                      title={store.name}
                      product={store.name}
                      handleUpdate={handleEditStore}
                      extraActions={[
                        {
                          key: "manage",
                          Icon: FiTool,
                          label: t("ManageStore") || "Manage store",
                          className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
                          onClick: () => handleManageStore(store),
                        },
                        {
                          key: store.isActive ? "archive" : "unarchive",
                          Icon: FiArchive,
                          label: t(store.isActive ? "Archive" : "Unarchive"),
                          className: "text-gray-500 dark:text-gray-400 hover:text-orange-600",
                          onClick: () => handleArchiveClick(store),
                        },
                        {
                          key: "view-storefront",
                          Icon: FiGlobe,
                          label: t("ViewStorefront") || "View storefront",
                          className: "text-gray-500 dark:text-gray-400 hover:text-emerald-600",
                          onClick: () => handleViewStorefront(store),
                        },
                      ]}
                      handleDuplicate={async (id) => {
                        try {
                          const res = await StoreServices.duplicateStore(id);
                          notifySuccess(t("StoreDuplicated"));

                          const newId = res?._id || res?.id || res?.store?._id || res?.data?._id;
                          if (!newId) {
                            // Fallback: open drawer so user can manually refresh
                            setDrawerKey((prev) => prev + 1);
                            toggleDrawer();
                            setIsUpdate(true);
                            return;
                          }

                          // Try to ensure duplicated store is available before opening
                          try {
                            await StoreServices.getStoreById(newId);
                          } catch (e) {
                            console.warn("Store fetch failed after duplication", e);
                          }

                          setServiceId(newId);
                          setDrawerKey((prev) => prev + 1);
                          toggleDrawer();
                          setIsUpdate(true);
                        } catch (err) {
                          notifyError(err?.response?.data?.message || err?.message);
                        }
                      }}
                      handleModalOpen={handleModalOpen}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("ShowingStoresCount", { displayed: displayedStores.length, total: filtered.length })}
          </p>
          <div className="inline-flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrevPage}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
            >
              <FiChevronLeft />
            </Button>
            <div className="inline-flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <Button
                  key={`page-${index + 1}`}
                  type="button"
                  onClick={() => setPage(index + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-semibold ${page === index + 1 ? "bg-emerald-600 text-white" : "text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"}`}>
                  {index + 1}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              onClick={handleNextPage}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-50"
            >
              <FiChevronRight />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let modalTitle = t("StoreStatusChangeTitle");
  let modalMessage = t("ConfirmAction");
  let modalConfirmLabel = t("Confirm");

  if (pendingStore) {
    if (pendingStore.isActive) {
      modalTitle = t("ArchiveStoreTitle");
      modalMessage = t("ArchiveStoreMessage", { storeName: pendingStore.name });
      modalConfirmLabel = t("Archive");
    } else {
      modalTitle = t("UnarchiveStoreTitle");
      modalMessage = t("UnarchiveStoreMessage", { storeName: pendingStore.name });
      modalConfirmLabel = t("Unarchive");
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-300">Stores</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                {summary.total} {t("TotalStoresCardTitle")}
              </span>{" "}
              {t("StoresPageDescription")}
            </p>
          </div>
          <Button
            onClick={handleOpenAddDrawer}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-6 py-3 hover:bg-emerald-700 shadow-lg shadow-emerald-200/30"
          >
            <FiPlus size={16} />
            {t("CreateNewStore")}
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <span className="material-symbols-outlined">storefront</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">+12%</span>
            </div>
            <p className="min-h-[48px] text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">{t("TotalStoresCardSubtitle")}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-gray-500">{t("ActiveStatus")}</span>
            </div>
            <p className="min-h-[48px] text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">{t("ActiveStoresCardTitle")}</p>
            <p className="text-3xl font-bold text-emerald-600">{summary.active}</p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">{t("ActiveCountCardTitle")}</span>
            </div>
            <p className="min-h-[48px] text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">{t("ActiveCountCardSubtitle")}</p>
            <p className="text-3xl font-bold text-emerald-600">{summary.active}</p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-2xl">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">{t("SuspendedStatus")}</span>
            </div>
            <p className="min-h-[48px] text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">{t("SuspendedInactiveCardTitle")}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.inactive}</p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">{t("PlatformWideLabel")}</span>
            </div>
            <p className="min-h-[48px] text-sm font-semibold leading-6 text-gray-700 dark:text-gray-300">{t("TotalRevenueCardTitle")}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalRevenue ? formatCurrency(summary.totalRevenue) : "â€”"}</p>
          </div>
        </div>
      </div>

      <DeleteModal id={serviceId} />
      <ConfirmActionModal
        isOpen={isArchiveConfirmOpen}
        onClose={() => {
          setIsArchiveConfirmOpen(false);
          setPendingStore(null);
        }}
        onConfirm={handleConfirmArchiveChange}
        isSubmitting={isArchiveProcessing}
        title={modalTitle}
        message={modalMessage}
        confirmLabel={modalConfirmLabel}
      />
      <MainDrawer>
        <StoreDrawer id={serviceId} key={serviceId || `new-${drawerKey}`} />
      </MainDrawer>

      <AnimatedContent>
        <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-[28px] border border-gray-200 dark:border-gray-800 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t("SearchStoresPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 pl-20 pr-4 text-sm text-gray-900 dark:text-gray-100 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900 outline-none transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none"
            >
              {statusOptions.map((option) => (
                <option key={option.value || "status"} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </select>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none"
            >
              {planOptions.map((option) => (
                <option key={option.value || "plan"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-3 px-4 text-sm text-gray-900 dark:text-gray-100 outline-none"
            >
              {categoryOptions.map((option) => (
                <option key={option.value || "category"} value={option.value}>
                  {option.value === "" ? t(option.label) : option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <FiFilter /> {t("MoreFilters")}
          </Button>
        </div>

        {storeSection}
      </AnimatedContent>
    </div>
  );
};

export default Stores;
