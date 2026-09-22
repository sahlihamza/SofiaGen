import React, { useContext } from "react";
import { Table, TableHeader, TableCell, TableBody, TableRow, TableContainer } from "@windmill/react-ui";
import { PDFDownloadLink } from "@react-pdf/renderer";
import InvoiceForDownload from "@/components/invoice/InvoiceForDownload";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { SidebarContext } from "@/context/SidebarContext";
import PageTitle from "@/components/Typography/PageTitle";
import { useNavigate } from "react-router-dom";
import formatMoney from "@/utils/formatMoney";
import { Button } from "@sofia/ui";

const InvoiceDrawer = () => {
  const { invoice } = useContext(SidebarContext);
  const navigate = useNavigate();

  if (!invoice) {
    return <div className="p-6">Loading...</div>;
  }
  const { currency, getNumberTwo, showDateFormat, globalSetting } = useUtilsFunction();

  return (
    <div className="p-6 w-full">
      <PageTitle>Invoice #{invoice.invoiceNumber}</PageTitle>

      <div className="mt-4 mb-6 flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500">Store</div>
          <div className="font-semibold">{invoice.storeId?.name || "-"}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Status</div>
          <div className="font-semibold capitalize">{invoice.status}</div>
        </div>
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <TableCell>Sr</TableCell>
              <TableCell>Description</TableCell>
              <TableCell className="text-center">Quantity</TableCell>
              <TableCell className="text-center">Unit Price</TableCell>
              <TableCell className="text-right">Amount</TableCell>
            </tr>
          </TableHeader>

          <TableBody>
            {Array.isArray(invoice.items) &&
              invoice.items.map((item, i) => (
                <TableRow key={i} className="dark:text-gray-300">
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center">{formatMoney(Number(item.unitPrice), invoice.currency)}</TableCell>
                  <TableCell className="text-right">{formatMoney(Number(item.total), invoice.currency)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-md">
        <div className="flex justify-between mb-2">
          <div className="text-sm text-gray-500">Subtotal</div>
          <div className="font-semibold">{formatMoney(Number(invoice.subtotal || 0), invoice.currency)}</div>
        </div>
        <div className="flex justify-between mb-2">
          <div className="text-sm text-gray-500">Tax</div>
          <div className="font-semibold">{formatMoney(Number(invoice.tax || 0), invoice.currency)}</div>
        </div>
        <div className="flex justify-between">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-xl font-bold">{formatMoney(Number(invoice.total || 0), invoice.currency)}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <PDFDownloadLink
          document={
            <InvoiceForDownload
              data={invoice}
              currency={currency}
              globalSetting={globalSetting}
              showDateFormat={showDateFormat}
              getNumberTwo={getNumberTwo}
            />
          }
          fileName={`invoice-${invoice.invoiceNumber}.pdf`}
        >
          {({ blob, url, loading, error }) => (
            <Button className="w-full" disabled={loading}>
              {loading ? "Preparing PDF..." : "Download PDF"}
            </Button>
          )}
        </PDFDownloadLink>

        <Button onClick={() => navigate(`/invoices/${invoice._id}`)} className="w-full">
          Open full view
        </Button>
      </div>
    </div>
  );
};

export default InvoiceDrawer;
