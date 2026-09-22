import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, Table, TableCell, TableContainer, TableHeader, TableBody, TableRow, Badge, Input, Select } from "@windmill/react-ui";
import { FiDownload, FiFilter, FiEye } from "react-icons/fi";
import dayjs from "dayjs";

import PageTitle from "@/components/Typography/PageTitle";
import AnimatedContent from "@/components/common/AnimatedContent";
import InvoiceServices from "@/services/InvoiceServices";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const BillingReports = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();

  const [filters, setFilters] = useState({
    storeId: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ["billing-reports", filters],
    queryFn: () =>
      InvoiceServices.getInvoices({
        startDate: filters.startDate,
        endDate: filters.endDate,
        storeId: filters.storeId,
        status: filters.status,
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

  const statusColors = {
    draft: "gray",
    sent: "blue",
    paid: "green",
    overdue: "red",
    canceled: "gray",
  };

  return (
    <AnimatedContent>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <PageTitle>{t("BillingReports") || "Billing Reports"}</PageTitle>
          {canExport && (
            <Button
              icon={FiDownload}
              onClick={() => window.print()}
            >
              {t("Export") || "Export"}
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Input
                label={t("StoreId") || "Store ID"}
                value={filters.storeId}
                onChange={(e) => handleFilterChange("storeId", e.target.value)}
              />
              <Select
                label={t("Status") || "Status"}
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">{t("All") || "All"}</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="canceled">Canceled</option>
              </Select>
            </div>
            <Button
              className="mt-4"
              onClick={() => refetch()}
              icon={FiFilter}
            >
              {t("Filter") || "Filter"}
            </Button>
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
                      <th>{t("InvoiceNumber") || "Invoice #"}</th>
                      <th>{t("Store") || "Store"}</th>
                      <th>{t("Amount") || "Amount"}</th>
                      <th>{t("Discounts") || "Discounts"}</th>
                      <th>{t("Tax") || "Tax"}</th>
                      <th>{t("Total") || "Total"}</th>
                      <th>{t("Status") || "Status"}</th>
                      <th>{t("IssueDate") || "Issue Date"}</th>
                      <th>{t("DueDate") || "Due Date"}</th>
                      <th className="text-center">{t("Actions") || "Actions"}</th>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {invoices?.data?.map((invoice) => (
                      <TableRow key={invoice._id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.storeId?.name || "-"}</TableCell>
                        <TableCell>
                          {invoice.baseAmount} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          {invoice.discounts?.length > 0
                            ? invoice.discounts
                                .map((d) => `-${d.discountAmount}`)
                                .join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {invoice.tax} {invoice.currency}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.total} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <Badge
                            type={statusColors[invoice.status] || "gray"}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dayjs(invoice.issuedAt).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell>
                          {dayjs(invoice.dueDate).format("YYYY-MM-DD")}
                        </TableCell>
                        <TableCell className="text-center">
                          {canView && (
                            <Button
                              layout="link"
                              onClick={() => (window.location.href = `/order/${invoice._id}`)}
                              className="text-gray-600"
                            >
                              <FiEye />
                            </Button>
                          )}
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

export default BillingReports;