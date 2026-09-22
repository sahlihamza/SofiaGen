import { useCallback, useRef, useState } from "react";

//internal import
import OrderServices from "@/services/OrderServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// SFG-155  drives the Print Labels modal:
//
//   idle -> generating -> ready -> (print) -> printed
//                      \-> error -> retry
//
// The PDF never leaves the browser: the API answers with the file, the hook
// keeps it behind a blob URL, and printing or downloading both work off that
// same object so a label is generated once no matter how it is consumed.

// With responseType "blob" axios wraps the JSON error body in a Blob too, so
// the server's message has to be read back out of it.
const readError = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // Not JSON  fall through to the generic message below.
    }
  }
  return error?.response?.data?.message || error?.message || "";
};

const buildFileName = (kind) =>
  `${kind === "manifest" ? "packing-manifest" : "packing-labels"}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

const usePrintLabels = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [orderIds, setOrderIds] = useState([]);
  // idle | generating | ready | error
  const [phase, setPhase] = useState("idle");
  const [kind, setKind] = useState(null); // "label" | "manifest"
  const [errorMessage, setErrorMessage] = useState("");
  const [document_, setDocument] = useState(null); // { url, fileName }
  const [isPrinted, setIsPrinted] = useState(false);
  const frameRef = useRef(null);

  const revoke = useCallback(() => {
    setDocument((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
    if (frameRef.current) {
      frameRef.current.remove();
      frameRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    revoke();
    setPhase("idle");
    setKind(null);
    setErrorMessage("");
    setIsPrinted(false);
  }, [revoke]);

  const open = useCallback(
    (ids) => {
      reset();
      setOrderIds(ids);
      setIsOpen(true);
    },
    [reset]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    reset();
  }, [reset]);

  const run = useCallback(
    async (nextKind, { format } = {}) => {
      if (!orderIds.length) return;

      setKind(nextKind);
      setPhase("generating");
      setErrorMessage("");
      setIsPrinted(false);

      try {
        const blob =
          nextKind === "manifest"
            ? await OrderServices.printPackingManifest({ orderIds })
            : await OrderServices.printPackingLabels({ orderIds, format });

        setDocument({ url: URL.createObjectURL(blob), fileName: buildFileName(nextKind) });
        setPhase("ready");
      } catch (error) {
        setPhase("error");
        setErrorMessage(await readError(error));
      }
    },
    [orderIds]
  );

  const generateLabels = useCallback((format) => run("label", { format }), [run]);
  const generateManifest = useCallback(() => run("manifest"), [run]);

  // Prints through a hidden iframe rather than a popup: a new window opened
  // after an await is what browsers block, an iframe is not.
  const print = useCallback(async () => {
    if (!document_?.url) return;

    const frame = window.document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.src = document_.url;
    frame.onload = () => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        // Some browsers refuse to drive a PDF plugin: the download button in
        // the modal stays the way out.
      }
    };
    window.document.body.appendChild(frame);
    if (frameRef.current) frameRef.current.remove();
    frameRef.current = frame;

    // A manifest is the carrier hand-over sheet, not the parcel label, so only
    // labels move the order's label state to "printed".
    if (kind !== "label") return;
    try {
      await OrderServices.markLabelsPrinted(orderIds);
      setIsPrinted(true);
    } catch (error) {
      // The paper is already coming out of the printer  a failed bookkeeping
      // call must not read as a failed print.
      notifyError(await readError(error));
    }
  }, [document_, kind, orderIds]);

  const download = useCallback(() => {
    if (!document_?.url) return;
    const anchor = window.document.createElement("a");
    anchor.href = document_.url;
    anchor.download = document_.fileName;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    notifySuccess(document_.fileName);
  }, [document_]);

  return {
    isOpen,
    open,
    close,
    orderIds,
    phase,
    kind,
    errorMessage,
    document: document_,
    isPrinted,
    generateLabels,
    generateManifest,
    print,
    download,
    retry: () => (kind ? run(kind) : undefined),
    back: reset,
  };
};

export default usePrintLabels;
