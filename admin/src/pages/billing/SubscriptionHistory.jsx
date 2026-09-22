import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Input } from "@windmill/react-ui";
import { FiDownload, FiFilter } from "react-icons/fi";
import dayjs from "dayjs";

import { notifyError } from "@/utils/toast";

// Internal imports
import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import SubscriptionServices from "@/services/SubscriptionServices";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const SubscriptionHistory = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();

  const [filters, setFilters] = useState({
    storeId: "",
    startDate: "",
    endDate: "",
  });

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ["subscription-history", filters],
    queryFn: () =>
      SubscriptionServices.getHistory({
        startDate: filters.startDate,
        endDate: filters.endDate,
        storeId: filters.storeId,
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

  const handleExport = async () => {
    notifyError("Export functionality to be implemented");
  };

  return (
    <AnimatedContent>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <PageTitle>{t("Subscription History")}</PageTitle>
          {canExport && (
            <Button onClick={handleExport} className="flex items-center gap-2">
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
                  {t("Store") || "Store"}
                </label>
                <Input
                  type="text"
                  placeholder={t("Store name or ID") || "Store name/ID"}
                  value={filters.storeId}
                  onChange={(e) => handleFilterChange("storeId", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("Start Date") || "Start Date"}
                </label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t("End Date") || "End Date"}
                </label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full flex items-center justify-center gap-2">
                  <FiFilter /> {t("Apply Filters") || "Apply"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* History Table */}
        <Card>
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">{t("Loading") || "Loading history..."}</p>
              </div>
            ) : history?.data && history.data.length > 0 ? (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Store") || "Store"}</TableCell>
                      <TableCell>{t("Old Plan") || "Old Plan"}</TableCell>
                      <TableCell>{t("New Plan") || "New Plan"}</TableCell>
                      <TableCell>{t("Action") || "Action"}</TableCell>
                      <TableCell>{t("Changed By") || "By"}</TableCell>
                      <TableCell>{t("Date") || "Date"}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {history.data.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {record.storeName || "-"}
                            </p>
                            <p className="text-xs text-gray-500">{record.storeId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {record.oldPlanId?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {record.newPlanId?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-sm font-medium rounded-full ${
                            record.action === "upgrade"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : record.action === "downgrade"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}>
                            {record.action.charAt(0).toUpperCase() + record.action.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {record.performedBy?.name || "-"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.performedBy?.email || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {dayjs(record.createdAt).format("DD/MM/YYYY HH:mm")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{t("No history found") || "No subscription history found."}</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AnimatedContent>
  );
};

export default SubscriptionHistory;
