import { FiPrinter } from "react-icons/fi";

//internal import
import Tooltip from "@/components/tooltip/Tooltip";
import OrderServices from "@/services/OrderServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { useCurrency } from "@/hooks/useCurrency";
import InvoiceForPrint from "@/components/invoice/InvoiceForPrint";
import { useRef, useState } from "react";
import useReactToPrint from "react-to-print";
import { notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const PrintReceipt = ({ orderId }) => {
  const printRefTwo = useRef();
  const [orderData, setOrderData] = useState({});
  const { globalSetting } = useUtilsFunction();
  const { currency } = useCurrency();

  const pageStyle = `
    @media print {
      @page {
        size: ${
          globalSetting?.receipt_size === "A4"
            ? "8.5in 14in"
            : globalSetting?.receipt_size === "3-1/8"
            ? "9.8in 13.8in"
            : globalSetting?.receipt_size === "2-1/4"
            ? "3in 8in"
            : "3.5in 8.5in"
        };
        margin: 0;
        padding: 0;
        font-size: 10px !important;
      }
    
      @page: first {
        size: ${
          globalSetting?.receipt_size === "A4"
            ? "8.5in 14in"
            : globalSetting?.receipt_size === "3-1/8"
            ? "9.8in 13.8in"
            : globalSetting?.receipt_size === "2-1/4"
            ? "3in 8in"
            : "3.5in 8.5in"
        };
        margin: 0;
        font-size: 10px !important;
      }
    }
  `;

  const handlePrint = useReactToPrint({
    content: () => printRefTwo.current,
    pageStyle: pageStyle,
    documentTitle: "Invoice",
  });

  const handlePrintReceipt = async (id) => {
    try {
      const res = await OrderServices.getOrderById(id);
      setOrderData(res);
      handlePrint();
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
  };

  return (
    <>
      <div style={{ display: "none" }}>
        {Object.keys(orderData).length > 0 && (
          <InvoiceForPrint
            data={orderData}
            printRef={printRefTwo}
            globalSetting={globalSetting}
            currency={currency}
          />
        )}
      </div>
      <Button
        onClick={() => handlePrintReceipt(orderId)}
        type="button"
        className="ml-2 p-2 cursor-pointer text-gray-500 hover:text-emerald-600 focus:outline-none"
      >
        <Tooltip
          id="receipt"
          Icon={FiPrinter}
          title="Print Receipt"
          bgColor="#f59e0b"
        />
      </Button>
    </>
  );
};

export default PrintReceipt;
