import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Table, TableBody, TableCell, TableHeader, TableRow, Badge } from "@windmill/react-ui";
import {
  FiUsers,
  FiActivity,
  FiShield,
  FiTrendingUp,
  FiDollarSign,
  FiCreditCard,
  FiShoppingCart,
  FiGlobe,
  FiBarChart2,
  FiAlertTriangle,
  FiServer,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import platformDashboardAPI from "@/services/api/platformDashboardAPI";
import platformAPI from "@/services/api/platformAPI";
import ChartCard from "@/components/chart/ChartCard";
import LineChart from "@/components/chart/LineChart/LineChart";
import { Button } from "@sofia/ui";

const DashboardStatCard = ({ icon: Icon, title, value, detail, color }) => (
  <Card className="shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800">
    <CardBody className="p-5">
      <div className="flex items-start gap-4">
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${color}`}>
          <Icon className="text-white" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 font-semibold">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {detail && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{detail}</p>}
        </div>
      </div>
    </CardBody>
  </Card>
);

const QuickActionButton = ({ to, label }) => (
  <Link to={to}>
    <Button className="justify-center" size="small">
      {label}
    </Button>
  </Link>
);

const PlatformDashboard = () => {
  const { t } = useTranslation();

  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ["platformDashboardStats"],
    queryFn: platformDashboardAPI.getDashboard,
    staleTime: 60 * 1000,
  });

  const { data: revenueAnalytics } = useQuery({
    queryKey: ["platformRevenueAnalytics"],
    queryFn: () => platformAPI.getRevenueAnalytics(12),
    staleTime: 60 * 1000,
  });

  const { data: userAnalytics } = useQuery({
    queryKey: ["platformUserAnalytics"],
    queryFn: () => platformAPI.getUserAnalytics(12),
    staleTime: 60 * 1000,
  });

  const { data: subscriptionAnalytics } = useQuery({
    queryKey: ["platformSubscriptionAnalytics"],
    queryFn: platformAPI.getSubscriptionAnalytics,
    staleTime: 60 * 1000,
  });

  const { data: churnAnalytics } = useQuery({
    queryKey: ["platformChurnAnalytics"],
    queryFn: () => platformAPI.getChurnAnalytics(6),
    staleTime: 60 * 1000,
  });

  const { data: paymentsAnalytics } = useQuery({
    queryKey: ["platformPaymentsAnalytics"],
    queryFn: platformAPI.getPaymentsAnalytics,
    staleTime: 60 * 1000,
  });

  const stats = statsData?.data || {};
  const kpi = stats.kpi || {};
  const revenue = stats.revenue || {};
  const payments = stats.payments || {};
  const usage = stats.usage || {};
  const infrastructure = stats.infrastructure || {};
  const health = stats.health || {};
  const alerts = stats.alerts || [];
  const topStores = stats.topStores || [];

  const revenueTrend = revenue.daily?.map((item) => ({
    date: item.date,
    total: item.total,
    order: item.count || 0,
  })) || [];

  if (isLoading) {
    return (
      <div className="mx-auto w-full">
        <PageTitle>{t("PlatformDashboard")}</PageTitle>
        <TableLoading row={6} col={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full">
        <PageTitle>{t("PlatformDashboard")}</PageTitle>
        <NotFound
          title={error?.response?.data?.message || error?.message || t("ErrorLoadingData")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <PageTitle>{t("PlatformDashboard")}</PageTitle>

      <section className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
        <DashboardStatCard
          icon={FiUsers}
          title="Total stores"
          value={kpi.stores?.total ?? 0}
          detail={`Active ${kpi.stores?.active ?? 0} â€¢ Suspended ${kpi.stores?.suspended ?? 0}`}
          color="bg-sky-500"
        />
        <DashboardStatCard
          icon={FiShield}
          title="Active subscriptions"
          value={kpi.subscriptions?.active ?? 0}
          detail={`Trials ${kpi.subscriptions?.trial ?? 0} â€¢ Renewal ${kpi.subscriptions?.renewalRate ?? 0}%`}
          color="bg-emerald-500"
        />
        <DashboardStatCard
          icon={FiDollarSign}
          title="Revenue today"
          value={revenue.today ?? 0}
          detail={`Month ${revenue.month ?? 0} â€¢ Growth ${revenue.monthlyGrowth ?? 0}%`}
          color="bg-violet-500"
        />
        <DashboardStatCard
          icon={FiTrendingUp}
          title="MRR / ARR"
          value={`${kpi.mrr?.value ?? 0} / ${kpi.mrr?.arr ?? 0}`}
          detail="Recurring revenue" 
          color="bg-orange-500"
        />
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-4 lg:grid-cols-2">
        <DashboardStatCard
          icon={FiCreditCard}
          title="Failed payments"
          value={payments.failed ?? 0}
          detail={`Pending ${payments.pending ?? 0}`}
          color="bg-red-500"
        />
        <DashboardStatCard
          icon={FiShoppingCart}
          title="Total orders"
          value={kpi.orders?.total ?? 0}
          detail={`Avg ${kpi.orders?.avgOrder ?? 0}`}
          color="bg-indigo-500"
        />
        <DashboardStatCard
          icon={FiBarChart2}
          title="Active customers"
          value={kpi.customers?.total ?? 0}
          detail={`Products ${usage.products ?? 0}`}
          color="bg-emerald-600"
        />
        <DashboardStatCard
          icon={FiGlobe}
          title="Usage & infrastructure"
          value={`${usage.apiCalls ?? 0} API calls`}
          detail={`CPU ${infrastructure.cpu ?? 0} â€¢ RAM ${infrastructure.ram ?? 0}`}
          color="bg-cyan-500"
        />
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-3 lg:grid-cols-2">
        <ChartCard title="Revenue Analytics">
          {revenueTrend.length > 0 ? (
            <div className="h-[320px]">
              <LineChart salesReport={revenueTrend} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-gray-500 dark:text-gray-400">
              No revenue trend data available.
            </div>
          )}
        </ChartCard>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("StoreAnalytics")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{kpi.stores?.total ?? 0} stores</p>
              </div>
              <FiActivity className="text-2xl text-sky-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Active stores</span>
                <span>{kpi.stores?.active ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Suspended</span>
                <span>{kpi.stores?.suspended ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trial</span>
                <span>{kpi.stores?.trial ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>New this month</span>
                <span>{kpi.growth?.month ?? 0}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("PlatformHealth")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100 capitalize">{health.status ?? "healthy"}</p>
              </div>
              <FiServer className="text-2xl text-emerald-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Critical alerts</span>
                <span>{health.criticalAlerts ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Warning alerts</span>
                <span>{health.warningAlerts ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Monitored services</span>
                <span>{health.services?.length ?? 0}</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-3 lg:grid-cols-2">
        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden col-span-2">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("TopStores")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("RevenueLeaders")}</p>
              </div>
              <FiActivity className="text-2xl text-indigo-500" />
            </div>
            <div className="space-y-3">
              {topStores.length > 0 ? (
                topStores.slice(0, 6).map((store) => (
                  <div key={String(store.storeId)} className="grid grid-cols-12 gap-3 items-center py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div className="col-span-5 text-sm font-medium text-gray-900 dark:text-gray-100">{store.name}</div>
                    <div className="col-span-2 text-sm text-gray-500 dark:text-gray-300">{store.owner}</div>
                    <div className="col-span-2 text-sm text-gray-500 dark:text-gray-300">{store.plan}</div>
                    <div className="col-span-2 text-sm text-gray-500 dark:text-gray-300">{store.orders}</div>
                    <div className="col-span-1 text-sm font-semibold text-right text-gray-900 dark:text-gray-100">{store.revenue}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No top stores available yet.</div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("AlertCenter")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{alerts.length} active</p>
              </div>
              <FiAlertTriangle className="text-2xl text-amber-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              {alerts.length > 0 ? (
                alerts.slice(0, 6).map((alert) => {
                  let severityClass = "bg-slate-500 text-white";

                  if (alert.severity === "critical") {
                    severityClass = "bg-red-500 text-white";
                  } else if (alert.severity === "warning") {
                    severityClass = "bg-amber-500 text-black";
                  }

                  return (
                    <div key={alert.type + alert.message} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{alert.message}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full ${severityClass}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Source: {alert.type}</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No active alerts.</div>
              )}
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-3 lg:grid-cols-2">
        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("SubscriptionAnalytics")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{subscriptionAnalytics?.data?.total || 0}</p>
              </div>
              <FiActivity className="text-2xl text-emerald-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Active</span>
                <Badge type="success">{subscriptionAnalytics?.data?.byStatus?.active || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Past due</span>
                <Badge type="warning">{subscriptionAnalytics?.data?.byStatus?.past_due || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Cancelled</span>
                <Badge type="danger">{subscriptionAnalytics?.data?.byStatus?.cancelled || 0}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("ChurnAnalytics")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{churnAnalytics?.data?.churnRate || 0}%</p>
              </div>
              <FiTrendingUp className="text-2xl text-red-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Lost revenue</span>
                <span className="font-semibold">${churnAnalytics?.data?.lostRevenue || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Retention rate</span>
                <Badge type="success">{churnAnalytics?.data?.retentionRate || 0}%</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <CardBody className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t("PaymentAnalytics")}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{paymentsAnalytics?.data?.totalPayments || 0}</p>
              </div>
              <FiCreditCard className="text-2xl text-teal-500" />
            </div>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Total revenue</span>
                <span className="font-semibold">${paymentsAnalytics?.data?.totalRevenue || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Success rate</span>
                <Badge type="success">{paymentsAnalytics?.data?.successRate || 0}%</Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-2">
        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t("RevenueAnalytics")}</h3>
          </div>
          <CardBody>
            {revenueAnalytics?.data?.monthly ? (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Month")}</TableCell>
                      <TableCell>{t("Revenue")}</TableCell>
                      <TableCell>{t("Invoices")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {revenueAnalytics.data.monthly.length > 0 ? (
                      revenueAnalytics.data.monthly.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>${item.total}</TableCell>
                          <TableCell>{item.invoiceCount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500">{t("NoData")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <p className="text-gray-500">{t("NoData")}</p>
            )}
          </CardBody>
        </Card>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t("UserAnalytics")}</h3>
          </div>
          <CardBody>
            {userAnalytics?.data?.growth ? (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Month")}</TableCell>
                      <TableCell>{t("NewUsers")}</TableCell>
                      <TableCell>{t("ActiveUsers")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {userAnalytics.data.growth.length > 0 ? (
                      userAnalytics.data.growth.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell>{item.count}</TableCell>
                          <TableCell>{t("NotAvailable")}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-gray-500">{t("NoData")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <p className="text-gray-500">{t("NoData")}</p>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 mt-6 xl:grid-cols-4 lg:grid-cols-2">
        <QuickActionButton to="/stores" label="Voir boutiques" />
        <QuickActionButton to="/billing/plans" label="Voir plans" />
        <QuickActionButton to="/payments" label="Voir paiements" />
      </section>
    </div>
  );
};

export default PlatformDashboard;
