import React, { useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { Input } from "@windmill/react-ui";
import { BsFileEarmarkCode, BsFileEarmarkMedical } from "react-icons/bs";
import { FiDownload, FiPlus, FiUpload, FiUploadCloud, FiXCircle } from "react-icons/fi";
import { SecondaryButton, PrimaryButton } from "@sofia/ui";
import { Button } from "@sofia/ui";

const DataImportExportToolbar = ({
  onExportCSV,
  onExportJSON,
  onImportSubmit,
  isExporting = false,
  isImporting = false,
  entityName = "",
  acceptFileTypes = ".json",
  onFileSelect,
}) => {
  const { t } = useTranslation();
  const exportDropdownRef = useRef(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportBoxShown, setIsImportBoxShown] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSelectedFile(file);

    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleRemoveSelectFile = () => {
    setFileName("");
    setSelectedFile(null);
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const handleImportClick = () => {
    if (onImportSubmit && selectedFile) {
      onImportSubmit(selectedFile, handleRemoveSelectFile);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
      {/* Export Button & Dropdown */}
      {(onExportCSV || onExportJSON) && (
        <div ref={exportDropdownRef} className="relative">
          <SecondaryButton
            type="button"
            disabled={isExporting}
            onClick={() => setIsExportOpen((prev) => !prev)}
            className="border flex justify-center items-center border-gray-300 hover:border-emerald-400 hover:text-emerald-400 dark:text-gray-300 cursor-pointer h-10 px-4 rounded-md focus:outline-none disabled:opacity-50 transition-colors duration-150"
          >
            <FiDownload className="mr-2" />
            <span className="text-xs">{t("Export")}</span>
          </SecondaryButton>
          {isExportOpen && (
            <ul className="absolute mt-1 w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-40">
              {onExportCSV && (
                <li>
                  <SecondaryButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsExportOpen(false);
                      onExportCSV();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400 focus:outline-none rounded-none justify-start"
                  >
                    <BsFileEarmarkMedical className="w-4 h-4" />
                    {t("ExportToCSV")}
                  </SecondaryButton>
                </li>
              )}
              {onExportJSON && (
                <li>
                  <SecondaryButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsExportOpen(false);
                      onExportJSON();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-emerald-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-emerald-400 focus:outline-none rounded-none justify-start"
                  >
                    <BsFileEarmarkCode className="w-4 h-4" />
                    {t("ExportToJSON")}
                  </SecondaryButton>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Import Toggle Button */}
      {onImportSubmit && (
        <PrimaryButton
          type="button"
          onClick={() => setIsImportBoxShown((prev) => !prev)}
          className="border flex justify-center items-center h-10 px-4 hover:text-yellow-400 border-gray-300 dark:text-gray-300 cursor-pointer hover:border-yellow-400 rounded-md focus:outline-none transition-colors duration-150"
        >
          <FiUpload className="mr-2" />
          <span className="text-xs">{t("Import")}</span>
        </PrimaryButton>
      )}

      {/* Import File Input Box */}
      {isImportBoxShown && (
        <div className="w-full flex flex-wrap gap-2 animate-fade-in">
          <div className="h-10 border border-dashed border-emerald-500 rounded-md flex-grow">
            <label className="w-full h-10 rounded-lg flex items-center px-2 text-xs dark:text-gray-400 leading-none cursor-pointer">
              <Input
                disabled={isImporting}
                type="file"
                accept={acceptFileTypes}
                onChange={handleSelectFile}
                className="hidden"
              />
              {fileName ? (
                <span className="truncate">{fileName}</span>
              ) : (
                <>
                  <FiUploadCloud className="mr-2 text-emerald-500 text-lg dark:text-gray-400" />
                  {t("SelectYourJSON")} {entityName || t("Data")} {t("File")}
                </>
              )}
              {fileName && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveSelectFile();
                  }}
                  className="text-red-500 focus:outline-none ml-auto text-lg hover:text-red-700"
                >
                  <FiXCircle />
                </span>
              )}
            </label>
          </div>
          <Button
            type="button"
            disabled={isImporting || !selectedFile}
            onClick={handleImportClick}
            className="h-10 px-4"
          >
            <span className="mr-1">
              <FiPlus />
            </span>
            {t("ImportNow")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DataImportExportToolbar;
