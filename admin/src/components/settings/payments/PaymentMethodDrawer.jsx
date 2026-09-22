import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiSave, FiX } from "react-icons/fi";

import PaymentMethodServices from "@/services/PaymentMethodServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import CStatusSwitch from "@/components/ui/CStatusSwitch";
import { Button } from "@sofia/ui";

const emptyForm = {
  code: "",
  name: "",
  type: "online",
  status: "active",
  displayOrder: 0,
};

const PaymentMethodDrawer = ({ isOpen, onClose, editing, onSuccess }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm);
      return;
    }

    if (editing) {
      setForm({
        code: editing.code || "",
        name: typeof editing.name === "object"
          ? editing.name.en || Object.values(editing.name).find(Boolean) || ""
          : editing.name || "",
        type: editing.type || "online",
        status: editing.status || "active",
        displayOrder: editing.displayOrder || 0,
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, editing]);

  const createMutation = useMutation({
    mutationFn: (body) => PaymentMethodServices.createMethod(body),
    onSuccess: () => {
      notifySuccess(t("PaymentMethodCreated") || "Payment method created");
      queryClient.invalidateQueries(["paymentMethodsCatalog"]);
      onSuccess?.();
      onClose();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message || "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (body) => PaymentMethodServices.updateMethod(editing._id, body),
    onSuccess: () => {
      notifySuccess(t("PaymentMethodUpdated") || "Payment method updated");
      queryClient.invalidateQueries(["paymentMethodsCatalog"]);
      onSuccess?.();
      onClose();
    },
    onError: (err) => notifyError(err?.response?.data?.message || err?.message || "Update failed"),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      ...form,
      name: { en: form.name },
      displayOrder: Number(form.displayOrder) || 0,
    };

    if (!body.code || !body.name.en) {
      notifyError(t("CodeAndNameRequired") || "Code and name are required");
      return;
    }

    if (editing) {
      updateMutation.mutate(body);
    } else {
      createMutation.mutate(body);
    }
  };

  const isSaving = createMutation.isLoading || updateMutation.isLoading;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {editing
                ? t("EditPaymentMethod") || "Edit Payment Method"
                : t("AddPaymentMethod") || "Add Payment Method"}
            </h3>
            <p className="text-sm text-gray-500">
              {editing
                ? t("EditPaymentMethodDescription") || "Update this payment method"
                : t("AddPaymentMethodDescription") || "Add a new payment method"}
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FiX size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Code") || "Code"} *
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => handleChange("code", e.target.value)}
              disabled={!!editing}
              placeholder="stripe"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Name") || "Name"} *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Credit Card"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Type") || "Type"}
            </label>
            <select
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Status") || "Status"}
            </label>
            <CStatusSwitch
              checked={form.status === "active"}
              onChange={(checked) => handleChange("status", checked ? "active" : "inactive")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("DisplayOrder") || "Display Order"}
            </label>
            <input
              type="number"
              value={form.displayOrder}
              onChange={(e) => handleChange("displayOrder", e.target.value)}
              placeholder="0"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md transition-colors hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {t("Cancel") || "Cancel"}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving || !form.code || !form.name}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FiSave className="h-4 w-4" />
            )}
            {editing ? t("Update") || "Update" : t("Create") || "Create"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentMethodDrawer;
