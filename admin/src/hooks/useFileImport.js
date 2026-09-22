import { useRef, useState } from "react";
import Ajv from "ajv";
import csvToJson from "csvtojson";
import { notifyError, notifySuccess } from "@/utils/toast";

/**
 * useFileImport — generic CSV/JSON file selection + Ajv validation +
 * bulk import flow. Extracted from the 834-line useFilter.js god hook.
 *
 * @param {Object} cfg
 *   - schema {Object}     — Ajv schema to validate each row
 *   - onImport {Function} — async (rows) => { imported: number, total: number }
 *   - successMessage {string} — toast text on success

 * @returns {{
 *   filename, setFilename, isUploading, handleSelectFile,
 *   handleOnDrop, handleRemoveSelectFile, handleUpload,
 * }}
 */
export const useFileImport = ({ schema, onImport, successMessage = "Import completed!" } = {}) => {
  const inputRef = useRef(null);
  const [filename, setFilename] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [rows, setRows] = useState(null);

  const parseFile = async (file) => {
    if (!file) return null;
    const ext = file.name?.toLowerCase().split(".").pop();
    if (ext === "json") {
      const text = await file.text();
      return JSON.parse(text);
    }
    return csvToJson().fromString(await file.text());
  };

  const validate = (data) => {
    if (!schema) return data;
    const ajv = new Ajv({ allErrors: true });
    const validateFn = ajv.compile(schema);
    if (!Array.isArray(data) || !data.every(validateFn)) {
      const err = validateFn.errors?.[0];
      throw new Error(
        err ? `Invalid row at ${err.instancePath || "root"}: ${err.message}` : "Invalid file"
      );
    }
    return data;
  };

  const handleSelectFile = async (event) => {
    const file = event?.target?.files?.[0] || event;
    if (!file) return;
    try {
      setFilename(file.name);
      const parsed = await parseFile(file);
      setRows(validate(parsed));
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to read file");
      setFilename("");
      setRows(null);
    }
  };

  const handleOnDrop = (event) => {
    event?.preventDefault?.();
    const file = event?.dataTransfer?.files?.[0];
    if (file) handleSelectFile({ target: { files: [file] } });
  };

  const handleRemoveSelectFile = () => {
    setFilename("");
    setRows(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!rows) return;
    if (!onImport) {
      throw new Error("useFileImport: `onImport` callback is required");
    }
    try {
      setIsUploading(true);
      const result = await onImport(rows);
      notifySuccess(
        result?.message ||
          (result?.imported != null
            ? `${result.imported}/${result.total || rows.length} imported`
            : successMessage)
      );
      handleRemoveSelectFile();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    filename,
    setFilename,
    isUploading,
    handleSelectFile,
    handleOnDrop,
    handleRemoveSelectFile,
    handleUpload,
    inputRef,
    rows,
  };
};

export default useFileImport;
