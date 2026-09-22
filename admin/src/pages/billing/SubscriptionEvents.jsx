import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Badge, Input } from "@windmill/react-ui";
import { FiDownload, FiFilter } from "react-icons/fi";
import dayjs from "dayjs";

import { notifyError } from "@/utils/toast";

// Internal imports
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const SubscriptionEvents = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();

  const [filters, setFilters] = useState({
    type: "", // "created", "upgraded", "downgraded", "canceled", etc.
    storeId: "",
  });

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["subscription-events", filters],
    queryFn: () =>
      SubscriptionServices.getEvents({
        type: filters.type,
        storeId: filters.storeId,
        limit: 100,
      }),
  });

  const canView = hasPermission("billing", "view");
  const canExport = hasPermission("billing", "export");

  if (!canView) {
    return (
      <div className="p-6">
        <PageTitle>{t("AccessDenied") || "Access Denied"}</PageTitle>
      </div>
    );
  }

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getEventBadge = (type, status) => {
    const colors = {
      created: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      upgraded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      downgraded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      suspended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const colorClass = status === "failed" 
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      : colors[type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

    return <span className={`px-2 py-1 text-xs font-medium rounded ${colorClass}`}>{type}</span>;
  };

  if (error) {
    return (
      <AnimatedContent>
        <div className="p-6">
          <PageTitle>{t("Subscription Events")}</PageTitle>
          <Card className="bg-red-50 border-red-200">
            <CardBody>
              <p className="text-red-700">
                {t("Error loading events")}: {error.message}
              </p>
            </CardBody>
          </Card>
        </div>
      </AnimatedContent>
    );
  }

  return (
    <AnimatedContent>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <PageTitle>{t("Subscription Events")}</PageTitle>
          {canExport && (
            <Button onClick={() => notifyError("Export to be implemented")} className="flex items-center gap-2">
              <FiDownload /> {t("Export") || "Export"}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-gray-50 dark:bg-gray-800">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("Event Type") || "Event Type"}
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">{t("All types") || "All types"}</option>
                  <option value="created">{t("Created") || "Created"}</option>
                  <option value="upgraded">{t("Upgraded") || "Upgraded"}</option>
                  <option value="downgraded">{t("Downgraded") || "Downgraded"}</option>
                  <option value="canceled">{t("Canceled") || "Canceled"}</option>
                  <option value="suspended">{t("Suspended") || "Suspended"}</option>
                  <option value="assigned">{t("Assigned") || "Assigned"}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("Store") || "Store"}
                </label>
                <Input
                  type="text"
                  placeholder={t("Store name") || "Store name"}
                  value={filters.storeId}
                  onChange={(e) => handleFilterChange("storeId", e.target.value)}
                />
              </div>
              <div className="flex items-end col-span-2">
                <Button onClick={() => setFilters({ type: "", storeId: "" })} className="w-full">
                  {t("Clear Filters") || "Clear"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Events Table */}
        <Card>
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{t("Loading") || "Loading events..."}</p>
              </div>
            ) : events?.data && events.data.length > 0 ? (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Date") || "Date"}</TableCell>
                      <TableCell>{t("Store") || "Store"}</TableCell>
                      <TableCell>{t("Event") || "Event"}</TableCell>
                      <TableCell>{t("Status") || "Status"}</TableCell>
                      <TableCell>{t("Details") || "Details"}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {events.data.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {dayjs(event.createdAt).format("DD/MM/YYYY HH:mm")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {event.storeName || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {getEventBadge(event.type, event.status)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            event.status === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : event.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}>
                            {event.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {event.message || "-"}
                            {event.payload && Object.keys(event.payload).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer hover:text-blue-600">
                                  {t("Payload") || "Payload"}
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                                  {JSON.stringify(event.payload, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {t("No events found") || "No subscription events found."}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Summary Stats */}
        {events?.pagination && (
          <Card className="bg-blue-50 dark:bg-blue-900">
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t("Total Events") || "Total Events"}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {events.pagination.total}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t("This Month") || "This Month"}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {events.data?.filter((e) => {
                      const date = new Date(e.createdAt);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length || 0}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </AnimatedContent>
  );
};

export default SubscriptionEvents;
