import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

//internal import
import { notifyError } from "@/utils/toast";
import OrderServices from "@/services/OrderServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";

// The receipt is printed from the full order, which the list endpoint does not
// return  so the row fetches it on demand, then hands it to a hidden
// InvoiceForPrint the caller renders behind `printRef`.
const usePrintReceipt = () => {
  const printRef = useRef();
  const [orderData, setOrderData] = useState({});
  const { globalSetting } = useUtilsFunction();

  const receiptSize =
    globalSetting?.receipt_size === "A4"
      ? "8.5in 14in"
      : globalSetting?.receipt_size === "3-1/8"
      ? "9.8in 13.8in"
      : globalSetting?.receipt_size === "2-1/4"
      ? "3in 8in"
      : "3.5in 8.5in";

  const pageStyle = `
    @media print {
      @page {
        size: ${receiptSize};
        margin: 0;
        padding: 0;
        font-size: 10px !important;
      }

      @page: first {
        size: ${receiptSize};
        margin: 0;
        font-size: 10px !important;
      }
    }
`;

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: pageStyle,
    documentTitle: "Invoice",
  });

  const printReceipt = async (id) => {
    try {
      const res = await OrderServices.getOrderById(id);
      setOrderData(res);
      handlePrint();
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
  };

  return { printRef, orderData, globalSetting, printReceipt };
};

export default usePrintReceipt;
