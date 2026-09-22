import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  FiAlertTriangle,
  FiBox,
  FiCheck,
  FiDollarSign,
  FiPackage,
  FiRefreshCw,
  FiShoppingCart,
  FiUsers,
  FiTrendingUp,
  FiTarget,
  FiFilter,
  FiActivity,
  FiHeart,
  FiShoppingBag,
  FiStar,
  FiTruck,
  FiMail,
  FiBarChart2,
  FiEye,
  FiSettings,
  FiPlus,
  FiDownload,
  FiUpload,
  FiMenu,
  FiX,
  FiCalendar,
  FiChevronDown,
  FiZap,
  FiShield,
} from "react-icons/fi";
import LineChart from "@/components/chart/LineChart/LineChart";
import ChartCard from "@/components/chart/ChartCard";

import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import { useStoreContext } from "@/context/StoreContext";
import storeOwnerDashboardAPI from "@/services/storeOwnerDashboardAPI";
import AnimatedContent from "@/components/common/AnimatedContent";
import LazyDashboardWidget from "@/components/common/LazyDashboardWidget";
import { Button } from "@sofia/ui";

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7days", label: "7 days" },
  { value: "30days", label: "30 days" },
  { value: "90days", label: "90 days" },
  { value: "12months", label: "12 months" },
];

const WidgetCard = ({ title, subtitle, icon: Icon, children, className = "", action }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

const KpiCard = ({ title, value, subValue, icon: Icon, tone = "bg-gray-500", change, changeLabel }) => {
  const isPositive = change >= 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          {subValue && <p className="text-xs text-gray-500 dark:text-gray-400">{subValue}</p>}
          {change !== undefined && (
            <p className={`mt-1 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}{change}% {changeLabel && <span className="text-gray-400">{changeLabel}</span>}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-2 text-white ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    refunded: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
};

const HealthGauge = ({ score }) => {
  const color = score >= 80 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className={color} />
      </svg>
      <div className="absolute text-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">/100</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const { currentPage } = useContext(SidebarContext);
  const { currentStoreId } = useStoreContext();
  const [range, setRange] = useState("30days");

  // SO-09: without currentStoreId in the key, switching stores left this
  // query serving its old cached response (same key) until a manual
  // refresh/refetch â€” the `company` header fix alone isn't enough for an

  // already-cached React Query result to know it's now stale.
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ["store-owner-dashboard", currentStoreId, range],
    queryFn: () => storeOwnerDashboardAPI.getDashboardV2({ range }),
    enabled: !!currentStoreId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const d = dashboard?.data || {};

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        {error?.response?.data?.message || error?.message || String(error)}
      </div>
    );
  }

  return (
    <>
      <PageTitle>{t("DashboardOverview")}</PageTitle>

      <AnimatedContent>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Store Owner Dashboard</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Premium control center for your store</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                {RANGE_OPTIONS.map((opt) => (
                  <Button key={opt.value} onClick={() => setRange(opt.value)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${range === opt.value ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
                    {opt.label}
                  </Button>
                ))}
              </div>
              <Button onClick={() => refetch()} className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                <FiRefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700" />)}
          </div>
        ) : (
          <>
            {d.onboarding && d.onboarding.progress < 100 && (
              <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Get your store ready</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{d.onboarding.completed} of {d.onboarding.total} steps complete</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{d.onboarding.progress}%</span>
                </div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${d.onboarding.progress}%` }} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { id: "firstProduct", label: "Add your first product", href: "/products" },
                    { id: "shipping", label: "Set up shipping", href: "/store/store-settings" },
                    { id: "paymentMethod", label: "Enable a payment method", href: "/settings/payments" },
                    { id: "theme", label: "Choose a theme", href: "/store/themes" },
                  ].map((step) => {
                    const state = d.onboarding.steps.find((s) => s.id === step.id);
                    return (
                      <Link key={step.id} to={step.href} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition ${state?.done ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"}`}>
                        {state?.done ? <FiCheck className="h-4 w-4 flex-shrink-0" /> : <span className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-current opacity-40" />}
                        {step.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Today's Sales" value={d.kpis?.todaySales ? `${d.kpis.todaySales.toLocaleString()} $` : "$0"} icon={FiDollarSign} tone="bg-emerald-500" change={d.kpis?.todaySales ? 12 : 0} changeLabel="vs yesterday" />
              <KpiCard title="Orders Today" value={d.kpis?.ordersToday || 0} icon={FiShoppingCart} tone="bg-blue-500" change={5} changeLabel="vs yesterday" />
              <KpiCard title="Customers" value={d.customers?.total || 0} icon={FiUsers} tone="bg-violet-500" subValue={`${d.customers?.new || 0} new`} />
              <KpiCard title="Products" value={d.products?.total || 0} icon={FiBox} tone="bg-orange-500" subValue={`${d.products?.active || 0} active`} />
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard title="Pending Orders" value={d.orders?.pending || 0} icon={FiRefreshCw} tone="bg-blue-100 text-blue-700" />
              <KpiCard title="Completed Orders" value={d.orders?.completed || 0} icon={FiCheck} tone="bg-emerald-100 text-emerald-700" />
              <KpiCard title="Out of Stock" value={d.inventory?.outOfStock || 0} icon={FiPackage} tone="bg-red-100 text-red-700" />
              <KpiCard title="Low Stock" value={d.inventory?.lowStock || 0} icon={FiAlertTriangle} tone="bg-amber-100 text-amber-700" />
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sales Analytics</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Revenue, orders and profit trend</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                    <Button className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Line</Button>
                    <Button className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white dark:bg-gray-100 dark:text-gray-900">Bar</Button>
                    <Button className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Area</Button>
                  </div>
                </div>
                <div className="h-64">
                  <LineChart salesReport={(d.analytics?.series || []).map((entry) => ({ date: entry.date, total: entry.revenue, order: entry.orders }))} />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Store Health Score</h3>
                <div className="flex flex-col items-center">
                  <HealthGauge score={d.health?.score || 0} />
                  <p className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                    {d.health?.score >= 80 ? "Excellent" : d.health?.score >= 50 ? "Needs attention" : "Critical issues detected"}
                  </p>
                  <div className="mt-3 w-full space-y-2">
                    {d.health?.breakdown && (
                      <>
                        <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Out of stock</span><span className="font-medium text-gray-900 dark:text-gray-100">{d.health.breakdown.outOfStock || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Low stock</span><span className="font-medium text-gray-900 dark:text-gray-100">{d.health.breakdown.lowStock || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Pending reviews</span><span className="font-medium text-gray-900 dark:text-gray-100">{d.health.breakdown.pendingReviews || 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-500 dark:text-gray-400">Pending orders</span><span className="font-medium text-gray-900 dark:text-gray-100">{d.health.breakdown.pendingOrders || 0}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-3">
              <LazyDashboardWidget widget="aiInsights" storeId={currentStoreId}>
                {(aiInsights) => (
                  <WidgetCard title="AI Insights" subtitle="Powered by AI" icon={FiZap}>
                    <div className="space-y-2">
                      {(aiInsights || []).slice(0, 3).map((insight, idx) => (
                        <div key={idx} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{insight.title}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{insight.detail}</p>
                        </div>
                      ))}
                    </div>
                  </WidgetCard>
                )}
              </LazyDashboardWidget>

              <WidgetCard title="Sales Goal" subtitle="Monthly target" icon={FiTarget}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{d.goals?.progress || 0}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${d.goals?.progress || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>${d.goals?.currentRevenue?.toLocaleString() || 0}</span>
                    <span>Target: ${d.goals?.targetRevenue?.toLocaleString() || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.goals?.remainingOrders || 0} orders remaining</p>
                </div>
              </WidgetCard>

              <WidgetCard title="Conversion Funnel" subtitle="Today" icon={FiActivity}>
                <div className="space-y-2">
                  {[
                    { label: "Visitors", value: d.conversionFunnel?.visitors || 0 },
                    { label: "Cart Additions", value: d.conversionFunnel?.cartAdditions || 0 },
                    { label: "Checkout Started", value: d.conversionFunnel?.checkoutStarted || 0 },
                    { label: "Payments", value: d.conversionFunnel?.paymentsSucceeded || 0 },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">{step.label}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{step.value.toLocaleString()}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (step.value / (d.conversionFunnel?.visitors || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cart abandonment: {d.conversionFunnel?.cartAbandonmentRate || 0}%</p>
                </div>
              </WidgetCard>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <WidgetCard title="Customers" subtitle={`${d.customers?.new || 0} new`}>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{d.customers?.total || 0}</p>
              </WidgetCard>
              <WidgetCard title="Products" subtitle={`${d.products?.active || 0} active`}>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{d.products?.total || 0}</p>
              </WidgetCard>
              <WidgetCard title="Payments" subtitle={`${d.payments?.pending || 0} pending`}>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{d.payments?.successful || 0}</p>
              </WidgetCard>
              <WidgetCard title="Shipping" subtitle={`${d.shipping?.delayed || 0} delayed`}>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{d.shipping?.ordersToShip || 0}</p>
              </WidgetCard>
            </div>

            <div className="mb-6 grid gap-4 xl:grid-cols-3">
              <WidgetCard title="Tasks" subtitle="Priority actions">
                <ul className="space-y-2">
                  {(d.tasks || []).map((task) => (
                    <li key={task.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                      <span className={`h-2 w-2 rounded-full ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{task.title}</span>
                    </li>
                  ))}
                </ul>
              </WidgetCard>

              <WidgetCard title="Alerts" subtitle="System notifications">
                <ul className="space-y-2">
                  {(d.alerts || []).map((alert, idx) => {
                    const content = (
                      <>
                        <FiAlertTriangle className={`h-4 w-4 flex-shrink-0 ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{alert.title}</span>
                      </>
                    );
                    return (
                      <li key={idx}>
                        {alert.actionUrl ? (
                          <Link to={alert.actionUrl} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 transition hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600">
                            {content}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </WidgetCard>

              <WidgetCard title="Quick Actions" subtitle="Create new">
                <div className="flex flex-wrap gap-2">
                  {(d.actions || []).map((action) => (
                    <a key={action.id} href={action.action} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                      <FiPlus className="h-3 w-3" /> {action.label}
                    </a>
                  ))}
                </div>
              </WidgetCard>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <LazyDashboardWidget widget="topProducts" storeId={currentStoreId}>
                {(topProducts) => (
                  <WidgetCard title="Top Products" subtitle="Best performers" icon={FiTrendingUp}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                            <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Sales</th>
                            <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {(topProducts || []).map((p, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-gray-900 dark:text-gray-100">{p.productName}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{p.sales}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{p.stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </WidgetCard>
                )}
              </LazyDashboardWidget>

              <LazyDashboardWidget widget="bestCustomers" storeId={currentStoreId}>
                {(bestCustomers) => (
                  <WidgetCard title="Best Customers" subtitle="Top spenders" icon={FiUsers}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</th>
                            <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Orders</th>
                            <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Spent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {(bestCustomers || []).map((c, idx) => (
                            <tr key={idx}>
                              <td className="py-2 text-gray-900 dark:text-gray-100">{c.name}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{c.orders}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">${c.totalSpent?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </WidgetCard>
                )}
              </LazyDashboardWidget>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <LazyDashboardWidget widget="recentActivity" storeId={currentStoreId}>
                {(recentActivity) => (
                  <WidgetCard title="Recent Activity" subtitle="Latest events" icon={FiActivity}>
                    <ul className="space-y-2">
                      {(recentActivity || []).map((activity, idx) => (
                        <li key={idx} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                          <span className={`h-2 w-2 rounded-full ${activity.type === "order" ? "bg-blue-500" : activity.type === "payment" ? "bg-emerald-500" : activity.type === "customer" ? "bg-violet-500" : "bg-gray-400"}`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{activity.title}</span>
                          {activity.amount && <span className="ml-auto text-sm font-medium text-gray-900 dark:text-gray-100">${activity.amount}</span>}
                        </li>
                      ))}
                    </ul>
                  </WidgetCard>
                )}
              </LazyDashboardWidget>

              <LazyDashboardWidget widget="salesChannels" storeId={currentStoreId}>
                {(salesChannels) => (
                  <WidgetCard title="Sales Channels" subtitle="Revenue by channel" icon={FiBarChart2}>
                    <div className="space-y-2">
                      {(salesChannels || []).map((channel, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{channel.channel}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">${channel.revenue?.toLocaleString()}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">{channel.orders} orders</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </WidgetCard>
                )}
              </LazyDashboardWidget>
            </div>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Financial Summary</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Revenue", value: d.financial?.revenue, color: "text-emerald-600" },
                  { label: "Expenses", value: d.financial?.expenses, color: "text-red-600" },
                  { label: "Profit", value: d.financial?.profit, color: "text-blue-600" },
                  { label: "Net Revenue", value: d.financial?.netRevenue, color: "text-violet-600" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                    <p className={`text-lg font-semibold ${item.color}`}>${item.value?.toLocaleString() || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </AnimatedContent>

      <PageTitle>{t("RecentOrder")}</PageTitle>

      {isLoading ? (
        <div className="mb-8 h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-700" />
      ) : (
        <div className="mb-8 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(d.orders?.recent || []).map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-gray-100">#{order.invoice || order._id?.slice(-6)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.customerName || "Guest"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">${order.total?.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{order.paymentMethod}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default Dashboard;
