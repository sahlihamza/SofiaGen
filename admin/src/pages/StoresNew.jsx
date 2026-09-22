

import { useContext, useMemo, useState } from "react";
import { FiPlus, FiTrash2, FiSearch, FiCheckCircle, FiSettings } from "react-icons/fi";
import { useHistory } from "react-router-dom";

import { SidebarContext } from "@/context/SidebarContext";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import StoreDrawer from "@/components/drawer/StoreDrawer";
import AnimatedContent from "@/components/common/AnimatedContent";
import TableLoading from "@/components/preloader/TableLoading";
import useAsync from "@/hooks/useAsync";
import StoreServices from "@/services/StoreServices";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { CButton, IconButton } from "@/components/ui";
import { Button } from "@sofia/ui";


const COLORS = [
  "#10B981", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

const getColor = (id) => {
  const index = parseInt(id?.slice(-1), 16) % COLORS.length;
  return COLORS[index] || COLORS[0];
};

const StoreCard = ({ store, onDelete, color }) => {
  const history = useHistory();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-14 h-14 rounded-2xl border flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ backgroundColor: `${color}20`, borderColor: `${color}35` }}
          >
            {store.logo ? (
              <img
                src={getLogoUrl(store.logo)}
                alt={store.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <span className="text-xl font-semibold" style={{ color }}>
                {store.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {store.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              {store.address || "No address provided"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
              Owner: {store.owner?.name || store.ownerName || "â€”"}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {store.isSelected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
              <FiCheckCircle size={12} /> Selected
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
              store.isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {store.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-5">
        <div className="mb-5 rounded-3xl bg-gray-50 dark:bg-gray-950 p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Currency</p>
          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
            {store.currency || "TND"}
          </p>
        </div>

        <div className="flex gap-3">
          <CButton
            variant="primary"
            onClick={() => history.push(`/stores/${store._id}`)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white py-3 text-xs font-semibold shadow-sm hover:opacity-95 transition"
          >
            <FiSettings size={14} />
            Manage
          </CButton>
          <IconButton
            icon="trash"
            onClick={() => onDelete(store._id, store.name)}
            aria-label="Delete store"
            className="inline-flex items-center justify-center p-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950 transition"
          />
        </div>

      </div>
    </div>
  );
};

const Stores = () => {
  const { toggleDrawer } = useContext(SidebarContext);
  const { serviceId, setServiceId, handleModalOpen } = useToggleDrawer();
  const { data: stores, loading, error } = useAsync(StoreServices.getAllStores);
  const [searchTerm, setSearchTerm] = useState("");
  const [drawerKey, setDrawerKey] = useState(0);

  const summary = useMemo(() => {
    const total = stores?.length || 0;
    const active = stores?.filter((item) => item.isActive).length || 0;
    const inactive = total - active;
    return { total, active, inactive };
  }, [stores]);

  const handleOpenAddDrawer = () => {
    setServiceId(undefined);
    setDrawerKey((prev) => prev + 1);
    toggleDrawer();
  };

  const filtered = useMemo(
    () => stores?.filter((s) =>
      s.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [stores, searchTerm]
  );

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Manage your stores, check status, and open the editor to update any listing.
            </p>
          </div>

          <Button
            onClick={handleOpenAddDrawer}
            className="rounded-2xl h-12 px-6 inline-flex items-center gap-2"
          >
            <FiPlus size={16} />
            Add Store
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Stores</p>
            <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{summary.total}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Stores</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-600">{summary.active}</p>
          </div>
          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Inactive Stores</p>
            <p className="mt-3 text-3xl font-semibold text-red-600">{summary.inactive}</p>
          </div>
        </div>
      </div>

      <DeleteModal id={serviceId} />
      <MainDrawer>
        <StoreDrawer id={serviceId} key={serviceId || `new-${drawerKey}`} />
      </MainDrawer>

      <AnimatedContent>
        <div className="rounded-[28px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-2xl">
              <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search stores"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-3xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 py-3 pl-12 pr-5 text-sm text-gray-900 dark:text-gray-100 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 outline-none transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span>{filtered?.length ?? 0} results</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs uppercase tracking-[0.2em] text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Search
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <TableLoading row={4} col={3} width={160} height={20} />
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-8 text-center text-red-700">
            <p>{error?.response?.data?.message || error?.message || String(error)}</p>
          </div>
        ) : filtered?.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800">
              <FiSettings size={28} className="text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No stores found</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Try a different search or add a new store.</p>
            <Button onClick={handleOpenAddDrawer} className="mt-6 rounded-2xl px-6 py-3">
              <FiPlus size={16} /> Add Store
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered?.map((store) => (
              <StoreCard key={store._id} store={store} onDelete={handleModalOpen} color={getColor(store._id)} />
            ))}
          </div>
        )}
      </AnimatedContent>
    </>
  );
};

export default Stores;
