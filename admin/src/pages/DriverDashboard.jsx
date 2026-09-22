import React, { useContext, useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import Cookies from "js-cookie";
import {
  FiPackage,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiStar,
  FiDollarSign,
  FiCalendar,
  FiTrendingUp,
  FiTruck,
  FiLogOut,
  FiZoomIn,
  FiRotateCcw,
} from "react-icons/fi";

import { AdminContext } from "@/context/AdminContext";
import RiderAppServices from "@/services/RiderAppServices";
import Status from "@/components/table/Status";
import { getTrackingBadgeClasses } from "@/utils/trackingBadge";
import { notifyError, notifySuccess } from "@/utils/toast";
import { removeAccessToken } from "@/services/tokenStore";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@sofia/ui";

const ORDERS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "Toutes les commandes" },
  { value: "Pending", label: "En attente" },
  { value: "Processing", label: "En traitement" },
  { value: "Delivered", label: "LivrÃ©es" },
  { value: "Cancel", label: "AnnulÃ©es" },

];

const StatCard = ({ icon: Icon, label, value, bg, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
    <div
      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: bg }}
    >
      <Icon size={18} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 truncate">{label}</p>
      <p className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100 truncate">
        {value}
      </p>
    </div>
  </div>
);

const DriverDashboard = () => {
  const history = useHistory();
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;
  const { formatMoney } = useCurrency();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [totalDoc, setTotalDoc] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchStats = () => {
    setStatsLoading(true);
    RiderAppServices.getMyStats()
      .then((res) => setStats(res?.data || null))
      .catch((err) => notifyError(err?.response?.data?.message || err?.message))
      .finally(() => setStatsLoading(false));
  };

  useEffect(fetchStats, []);

  useEffect(() => {
    let unmounted = false;
    setOrdersLoading(true);
    RiderAppServices.getMyOrders({
      search,
      status: statusFilter,
      page,
      limit: ORDERS_PER_PAGE,
    })
      .then((res) => {
        if (unmounted) return;
        setOrders(res?.data || []);
        setTotalDoc(res?.totalDoc || 0);
      })
      .catch((err) => notifyError(err?.response?.data?.message || err?.message))
      .finally(() => {
        if (!unmounted) setOrdersLoading(false);
      });
    return () => {
      unmounted = true;
    };
  }, [search, statusFilter, page]);

  const handleToggleAvailability = async () => {
    setTogglingAvailability(true);
    try {
      const res = await RiderAppServices.updateMyAvailability();
      notifySuccess("DisponibilitÃ© mise Ã  jour !");

      setStats((prev) => (prev ? { ...prev, availability: res?.data?.availability } : prev));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleLogout = () => {
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
    removeAccessToken();
    history.replace("/login");
  };

  const totalPages = Math.max(1, Math.ceil(totalDoc / ORDERS_PER_PAGE));
  const isOnline = stats?.availability === "Disponible";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100">
            <FiTruck className="text-emerald-500" size={22} />
            <span>Sofiagen Driver</span>
          </div>
          <Button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg"
          >
            <FiLogOut size={16} />
            <span className="hidden sm:inline">DÃ©connexion</span>
          </Button>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Bienvenue, {adminInfo?.name || stats?.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Votre tableau de bord de livraison â€” gÃ©rez vos commandes et suivez vos performances

          </p>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4">
              <StatCard icon={FiPackage} label="Livraisons totales" value={stats?.totalDeliveries || 0} bg="#DBEAFE" color="#2563EB" />
              <StatCard icon={FiCheckCircle} label="ComplÃ©tÃ©" value={stats?.completed || 0} bg="#D1FAE5" color="#059669" />
              <StatCard icon={FiClock} label="Commandes en cours" value={stats?.inProgress || 0} bg="#FEF3C7" color="#D97706" />
              <StatCard icon={FiXCircle} label="AnnulÃ©" value={stats?.cancelled || 0} bg="#FEE2E2" color="#DC2626" />
              <StatCard icon={FiStar} label="Note moyenne" value={stats?.averageRating || 0} bg="#FEF3C7" color="#D97706" />
              <StatCard icon={FiDollarSign} label="Revenus totaux" value={formatMoney(stats?.totalEarnings || 0)} bg="#EDE9FE" color="#7C3AED" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <StatCard icon={FiCalendar} label="Livraisons de ce mois-ci" value={stats?.deliveriesThisMonth || 0} bg="#D1FAE5" color="#059669" />
              <StatCard icon={FiTrendingUp} label="Revenus de ce mois-ci" value={formatMoney(stats?.revenueThisMonth || 0)} bg="#EDE9FE" color="#7C3AED" />
            </div>
          </>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Votre disponibilitÃ©</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Modifiez votre statut pour recevoir les nouvelles missions de livraison.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleToggleAvailability}
            disabled={togglingAvailability}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              isOnline
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"}`} />
            {isOnline ? "Online" : "Offline"}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">Mes commandes</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Toutes les commandes qui vous sont attribuÃ©es

              </p>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-11 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <input
            type="search"
            placeholder="Nom de recherche ou tracking ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-12 px-4 mb-4 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {ordersLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">
              Aucune commande ne correspond Ã  votre recherche.
            </p>
          ) : (
            <>
              {/* Mobile-first card list */}
              <div className="space-y-3 sm:hidden">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="border border-gray-100 dark:border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        #{order.invoice}
                      </span>
                      <Status status={order.status} />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {order.user_info?.name || "â€”"}

                    </p>
                    <p className="text-xs text-gray-400 mb-2">{order.trackingId}</p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTrackingBadgeClasses(
                          order.trackingStatus
                        )}`}
                      >
                        {order.trackingStatus}
                      </span>
                      <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">
                            {formatMoney(order.total || 0)}
                          </span>
                        <Link
                          to={`/order/${order._id}`}
                          className="text-emerald-600 flex items-center"
                        >
                          <FiZoomIn size={18} />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700">
                      <th className="py-3 pr-4">Invoice</th>
                      <th className="py-3 pr-4">Tracking ID</th>
                      <th className="py-3 pr-4">Customer</th>
                      <th className="py-3 pr-4">Total</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Tracking</th>
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-100">
                          #{order.invoice}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{order.trackingId}</td>
                        <td className="py-3 pr-4">{order.user_info?.name || "â€”"}</td>

                        <td className="py-3 pr-4">{formatMoney(order.total || 0)}</td>
                        <td className="py-3 pr-4">
                          <Status status={order.status} />
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTrackingBadgeClasses(
                              order.trackingStatus
                            )}`}
                          >
                            {order.trackingStatus}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("fr-FR")
                            : "â€”"}

                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-center gap-3">
                            <Link
                              to={`/order/${order._id}`}
                              className="text-gray-400 hover:text-emerald-600"
                            >
                              <FiZoomIn size={16} />
                            </Link>
                            <span className="text-gray-300 dark:text-gray-600">
                              <FiRotateCcw size={16} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-5 text-sm">
                <span className="text-gray-400">
                  Page {page} sur {totalPages} ({totalDoc} commande{totalDoc > 1 ? "s" : ""})
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    PrÃ©cÃ©dent
                  </Button>
                  <Button

                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
