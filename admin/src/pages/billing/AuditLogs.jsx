import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Badge, Input, Select } from "@windmill/react-ui";
import { FiFilter } from "react-icons/fi";
import dayjs from "dayjs";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import PlanServices from "@/services/PlanServices";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const AuditLogs = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();

  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    resourceId: "",
    startDate: "",
    endDate: "",
  });

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () =>
      PlanServices.getAuditLogs({
        action: filters.action,
        resourceType: filters.resourceType,
        resourceId: filters.resourceId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: 100,
      }),
  });

  const canView = hasPermission("billing", "view");

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

  const actionColors = {
    "plan.created": "green",
    "plan.updated": "blue",
    "plan.deleted": "red",
    "subscription.created": "green",
    "subscription.updated": "blue",
    "subscription.canceled": "gray",
    "subscription.upgraded": "green",
    "subscription.downgraded": "orange",
    "subscription.billing_failed": "red",
    "subscription.payment_succeeded": "green",
    "downgrade_blocked": "red",
    "over_quota_degraded": "orange",
    "trial_ending_soon": "blue",
    "payment_retry": "yellow",
  };

  return (
    <AnimatedContent>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <PageTitle>{t("AuditLogs") || "Audit Logs"}</PageTitle>
          <Button onClick={() => refetch()} icon={FiFilter}>
            {t("Refresh") || "Refresh"}
          </Button>
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Input
                label={t("Action") || "Action"}
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                placeholder="e.g. plan.created"
              />
              <Input
                label={t("ResourceType") || "Resource Type"}
                value={filters.resourceType}
                onChange={(e) =>
                  handleFilterChange("resourceType", e.target.value)
                }
                placeholder="e.g. plan"
              />
              <Input
                label={t("ResourceId") || "Resource ID"}
                value={filters.resourceId}
                onChange={(e) =>
                  handleFilterChange("resourceId", e.target.value)
                }
              />
              <Input
                label={t("StartDate") || "Start Date"}
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
              <Input
                label={t("EndDate") || "End Date"}
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {isLoading ? (
              <div className="text-center py-8">{t("Loading") || "Loading..."}</div>
            ) : (
              <TableContainer>
                <Table>
                  <TableHeader>
                    <tr>
                      <th>{t("Action") || "Action"}</th>
                      <th>{t("Actor") || "Actor"}</th>
                      <th>{t("Resource") || "Resource"}</th>
                      <th>{t("Changes") || "Changes"}</th>
                      <th>{t("CreatedAt") || "Created At"}</th>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {logs?.data?.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          <Badge
                            type={actionColors[log.action] || "gray"}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.actor?.email || log.actor?.userId || "-"}
                        </TableCell>
                        <TableCell>
                          {log.resource?.type}: {log.resource?.id}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.changes
                            ? Object.entries(log.changes)
                                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                                .join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {dayjs(log.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </AnimatedContent>
  );
};

export default AuditLogs;