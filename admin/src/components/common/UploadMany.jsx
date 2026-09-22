
import exportFromJSON from "export-from-json";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BsFileEarmarkCode, BsFileEarmarkMedical } from "react-icons/bs";
import {
  FiDownload,
  FiPlus,
  FiUpload,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";
import { IconButton, SecondaryButton, PrimaryButton } from "@sofia/ui";
// import { ImFileExcel } from "react-icons/im";
import { useLocation } from "react-router-dom";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import ProductServices from "@/services/ProductServices";
import { notifyError } from "@/utils/toast";
import { formatProductsForExport } from "@/utils/productExport";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

// `confirmInModal` is for the pages where picking a file hands straight over to
// a window that shows what was found and holds the confirm/cancel buttons
// (Products, with its column mapping screen). There, staging the file inline
// here would only add a second, redundant confirmation step, so the box below
// is not rendered at all and Import is a plain "pick a file" button.
// The other pages have no such window: the box is where their import is
// started, so they keep it.
const UploadMany = ({
  title,
  totalDoc,
  filename,
  exportData,
  isDisabled,
  confirmInModal,
  onExportClick,
  handleSelectFile,
  handleRemoveSelectFile,
  handleUploadMultiple,
}) => {
  const location = useLocation();
  const { t } = useTranslation();
  const dRef = useRef();
  const fileRef = useRef();
  const [dropDown, setDropDown] = useState(false);
  const [isImportBoxShown, setIsImportBoxShown] = useState(false);
  const { loading } = useContext(SidebarContext);
  const [loadingExport, setLoadingExport] = useState({
    name: "",
    status: false,
  });

  const handleExportCSV = () => {
    if (location.pathname === "/products") {
      setLoadingExport({ name: "csv", status: true });
      ProductServices.getAllProducts({
        page: 1,
        limit: totalDoc,
        category: null,
        title: null,
        price: 0,
      })
        .then((res) => {
          setDropDown(false);
          setLoadingExport({ name: "", status: false });
          exportFromJSON({
            data: formatProductsForExport(res.products),
            fileName: "products",
            exportType: exportFromJSON.types.csv,
          });
        })
        .catch((err) => {
          setLoadingExport({ name: "", status: false });
          setDropDown(false);
          notifyError(err?.message);
        });
    }
    if (location.pathname === "/categories") {
      exportFromJSON({
        data: exportData,
        fileName: "categories",
        exportType: exportFromJSON.types.csv,
      });
    }
    if (location.pathname === "/attributes") {
      exportFromJSON({
        data: exportData,
        fileName: "attributes",
        exportType: exportFromJSON.types.csv,
      });
    }

    if (location.pathname === "/coupons") {
      exportFromJSON({
        data: exportData,
        fileName: "coupons",
        exportType: exportFromJSON.types.csv,
      });
    }
    if (location.pathname === "/customers") {
      exportFromJSON({
        data: exportData,
        fileName: "customers",
        exportType: exportFromJSON.types.csv,
      });
    }
  };

  const handleExportJSON = () => {
    if (location.pathname === "/products") {
      setLoadingExport({ name: "json", status: true });
      ProductServices.getAllProducts({
        page: 1,
        limit: totalDoc,
        category: null,
        title: null,
        price: 0,
      })
        .then((res) => {
          setDropDown(false);
          setLoadingExport({ name: "", status: false });
          exportFromJSON({
            data: formatProductsForExport(res.products),
            fileName: "products",
            exportType: exportFromJSON.types.json,
          });
        })
        .catch((err) => {
          setDropDown(false);
          setLoadingExport({ name: "", status: false });
          notifyError(err?.message);
        });
    }
    if (location.pathname === "/categories") {
      exportFromJSON({
        data: exportData,
        fileName: "categories",
        exportType: exportFromJSON.types.json,
      });
    }
    if (location.pathname === "/attributes") {
      exportFromJSON({
        data: exportData,
        fileName: "attributes",
        exportType: exportFromJSON.types.json,
      });
    }

    if (location.pathname === "/coupons") {
      exportFromJSON({
        data: exportData,
        fileName: "coupons",
        exportType: exportFromJSON.types.json,
      });
    }
    if (location.pathname === "/customers") {
      exportFromJSON({
        data: exportData,
        fileName: "customers",
        exportType: exportFromJSON.types.json,
      });
    }
  };

  // Clicking "Import" opens the OS file picker straight away â€” the drop box
  // below is only there afterwards, to show what was picked and start/cancel
  // the import. Clearing the value first so re-picking the same file still
  // fires onChange.
  const handleOpenFilePicker = () => {
    // A file is already staged (the input is locked while it is) â€” just bring
    // the box back into view instead of silently doing nothing. Nothing is
    // staged in the `confirmInModal` flow, so there the button always picks,
    // including on the run after an import.
    if (!confirmInModal && isDisabled) {
      setIsImportBoxShown(true);
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    if (!confirmInModal && e.target?.files?.length) setIsImportBoxShown(true);
    handleSelectFile(e);
  };

  const handleCancelImport = () => {
    setIsImportBoxShown(false);
    if (fileRef.current) fileRef.current.value = "";
    handleRemoveSelectFile?.();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!dRef?.current?.contains(e.target)) {
        setDropDown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [dRef]);

  return (
    <div className=" lg:flex md:flex flex-grow-0">
      <div className="flex">
        <div ref={dRef} className="lg:flex-1 md:flex-1 mr-3 sm:flex-none">
          {(title === "Products" ||
            title === "Attribute" ||
            title === "Extra" ||
            title === "Coupon" ||
            title === "Customers" ||
            title === "Categories") && (
            <SecondaryButton
              onClick={() => {
                // On pages that pass a handler (Products), the Export button
                // opens the configurable export modal instead of the simple
                // CSV/JSON dropdown used elsewhere.
                if (onExportClick) {
                  onExportClick();
                  return;
                }
                setDropDown(!dropDown);
              }}
              className="border flex justify-center items-center border-gray-300 hover:border-emerald-400 hover:text-emerald-400  dark:text-gray-300 cursor-pointer h-10 w-20 rounded-md focus:outline-none"
            >
              {/* <BsPlus className="text-4xl" /> */}
              <FiUpload className="mr-2" />
              <span className="text-xs">{t("Export")}</span>
            </SecondaryButton>
          )}
          {dropDown && (
            <ul
              className="origin-top-left absolute  w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none z-40"
              style={{}}
            >
              <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="focus:outline-none w-full"
                >
                  <span className="flex items-center text-sm">
                    <BsFileEarmarkMedical
                      className="w-4 h-4 mr-3"
                      aria-hidden="true"
                    />

                    <span>
                      {t("ExportToCSV")}
                      {loadingExport.name === "csv" &&
                        loadingExport.status &&
                        "...."}
                    </span>
                  </span>
                </SecondaryButton>
              </li>

              <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                <SecondaryButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="focus:outline-none w-full"
                  onClick={handleExportJSON}
                >
                  <span className="flex items-center text-sm">
                    <BsFileEarmarkCode
                      className="w-4 h-4 mr-3"
                      aria-hidden="true"
                    />
                    <span>
                      {t("ExportToJSON")}
                      {loadingExport.name === "json" &&
                        loadingExport.status &&
                        "...."}
                    </span>
                  </span>
                </SecondaryButton>
              </li>
            </ul>
          )}
        </div>

        <div className="lg:flex-1 md:flex-1 mr-3  sm:flex-none">
          <PrimaryButton
            type="button"
            onClick={handleOpenFilePicker}
            disabled={confirmInModal && loading}
            className="border flex justify-center items-center h-10 w-20 hover:text-yellow-400  border-gray-300 dark:text-gray-300 cursor-pointer  py-2 hover:border-yellow-400 rounded-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiDownload className="mr-2" />
            <span className="text-xs">Import</span>
          </PrimaryButton>
        </div>
      </div>

      {/* Without the box, `isDisabled` â€” which stays on for as long as a file is
          staged â€” would lock this input for good, with no way left to clear it.
          What has to be blocked there is a second import while one is running,
          which is what `loading` marks. */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.json"
        disabled={confirmInModal ? loading : isDisabled}
        onChange={handleFileChange}
        className="hidden"
      />

      {!confirmInModal && isImportBoxShown && (
        <>
          <div className="w-full my-2 lg:my-0 md:my-0 flex">
              <div className="h-10 border border-dashed border-emerald-500 rounded-md">
                <div className="w-full rounded-lg h-10 flex justify-center items-center text-xs dark:text-gray-400 leading-none">
                  <SecondaryButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenFilePicker}
                    className="flex items-center px-2 focus:outline-none"
                  >
                    {filename ? (
                      filename
                    ) : (
                      <>
                        <FiUploadCloud className="mx-auto text-emerald-500 text-lg dark:text-gray-400" />{" "}
                        {t("SelectYourJSON")} {title} {t("File")}
                      </>
                    )}
                  </SecondaryButton>
                  {filename && (
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={handleCancelImport}
                      className="text-red-500 focus:outline-none mx-4 text-lg"
                    >
                      <FiXCircle />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>

            <div className="flex">
              {loading ? (
                <Button className="ml-2 h-10">
                  <LoadingSpinner alt="Loading" width={20} height={10} />{" "}
                  <span className="font-serif ml-2 font-light">Processing</span>
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleUploadMultiple}
                    className="h-10 ml-2 px-2"
                  >
                    <span className="">
                      <FiPlus />
                    </span>
                    <span className="text-sx w-20">{t("ImportNow")}</span>
                  </Button>
                  <Button
                    layout="outline"
                    onClick={handleCancelImport}
                    className="h-10 ml-2 px-3"
                  >
                    <span className="text-xs">{t("CancelBtn")}</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default UploadMany;
