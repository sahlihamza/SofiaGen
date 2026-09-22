import React, { useContext, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { SidebarContext } from "@/context/SidebarContext";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useDisableForDemo from "@/hooks/useDisableForDemo";
import { notifyError, notifySuccess } from "@/utils/toast";
import { errorMessage } from "@/utils/errorMessage";
import { LoadingSpinner } from "@/components/ui";
import { SecondaryButton, PrimaryButton } from "@sofia/ui";
import CModal from "@/components/modals/CModal";

/**
 * Registry: maps a pathname (or explicit key) to the delete strategy.
 * Each strategy exposes:
 *   - getTitle(t)        — modal title (optional)
 *   - getMessage(t)      — confirmation message
 *   - getSuccessMessage  — toast text on success
 *   - delete({ id, ids, setIsCheck, setServiceId, title, category })
 *
 * Add a new entity by adding an entry here. No more giant if/else chain.
 */
import UserServices from "@/services/UserServices";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import CouponServices from "@/services/CouponServices";
import CustomerServices from "@/services/CustomerServices";
import ProductServices from "@/services/ProductServices";
import StoreServices from "@/services/StoreServices";
import CurrencyServices from "@/services/CurrencyServices";
import RiderServices from "@/services/RiderServices";
import PlanServices from "@/services/PlanServices";
import AttributeServices from "@/services/AttributeServices";

const buildMessage = (t, { id, ids, isRestore }) => {
  if (isRestore) return t("DeleteModalRestoreConfirm") || "Restore this item?";
  if (Array.isArray(ids) && ids.length > 0) {
    return t("DeleteModalBulkConfirm", { count: ids.length }) || `Delete ${ids.length} selected item(s)?`;
  }
  return t("DeleteModalConfirm") || "Delete this item? This cannot be undone.";
};

const STRATEGIES = {
  "/products": {
    getTitle: () => "Delete product",
    delete: async ({ id, ids, setIsCheck, setServiceId }) => {
      if (Array.isArray(ids) && ids.length > 0) {
        const res = await ProductServices.deleteManyProducts({ ids });
        setIsCheck?.([]);
        setServiceId?.();
        return res?.message || "Products deleted";
      }
      const res = await ProductServices.deleteProduct(id);
      setServiceId?.();
      return res?.message || "Product deleted";
    },
  },
  "/category": {
    getTitle: () => "Delete category",
    delete: async ({ id, setServiceId }) => {
      const res = await ProductCategoryServices.deleteCategory(id);
      setServiceId?.();
      return res?.message || "Category deleted";
    },
  },
  "/categories": {
    getTitle: () => "Delete category",
    delete: async ({ id, setServiceId }) => {
      const res = await ProductCategoryServices.deleteCategory(id);
      setServiceId?.();
      return res?.message || "Category deleted";
    },
  },
  "/coupons": {
    getTitle: () => "Delete coupon",
    delete: async ({ id, setServiceId }) => {
      const res = await CouponServices.deleteCoupon(id);
      setServiceId?.();
      return res?.message || "Coupon deleted";
    },
  },
  "/customers": {
    getTitle: () => "Delete customer",
    delete: async ({ id, setServiceId }) => {
      const res = await CustomerServices.deleteCustomer(id);
      setServiceId?.();
      return res?.message || "Customer deleted";
    },
  },
  "/currencies": {
    getTitle: () => "Delete currency",
    delete: async ({ id, setServiceId }) => {
      const res = await CurrencyServices.deleteCurrency(id);
      setServiceId?.();
      return res?.message || "Currency deleted";
    },
  },
  "/attributes": {
    getTitle: () => "Delete attribute",
    delete: async ({ id, setServiceId }) => {
      const res = await AttributeServices.deleteAttribute(id);
      setServiceId?.();
      return res?.message || "Attribute deleted";
    },
  },
  "/riders": {
    getTitle: () => "Delete rider",
    delete: async ({ id, setServiceId }) => {
      const res = await RiderServices.deleteRider(id);
      setServiceId?.();
      return res?.message || "Rider deleted";
    },
  },
  "/plans": {
    getTitle: () => "Delete plan",
    delete: async ({ id, setServiceId }) => {
      const res = await PlanServices.deletePlan(id);
      setServiceId?.();
      return res?.message || "Plan deleted";
    },
  },
  "/our-staff": {
    getTitle: () => "Delete staff",
    delete: async ({ id, setServiceId }) => {
      const res = await UserServices.deleteStaff(id);
      setServiceId?.();
      return res?.message || "Staff deleted";
    },
  },
  "/stores": {
    getTitle: (t, ctx) => (ctx?.isRestore ? "Restore store" : "Delete store"),
    delete: async ({ id, setServiceId, isRestore }) => {
      if (isRestore) {
        const res = await StoreServices.restoreStore(id);
        setServiceId?.();
        return res?.message || "Store restored";
      }
      const res = await StoreServices.deleteStore(id);
      setServiceId?.();
      return res?.message || "Store deleted";
    },
  },
};

const DeleteModal = ({ id, ids, setIsCheck, category, title, useParamId }) => {
  const { isModalOpen, closeModal, setIsUpdate } = useContext(SidebarContext);
  const { setServiceId } = useToggleDrawer();
  const location = useLocation();
  const { t } = useTranslation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleDisableForDemo } = useDisableForDemo();

  const isRestore = typeof title === "string" && title.toLowerCase().includes("restore");
  const hasBulkIds = Array.isArray(ids) && ids.length > 0;

  const strategy = STRATEGIES[location.pathname] || STRATEGIES[useParamId];

  const handleDelete = async () => {
    if (handleDisableForDemo?.()) return;
    if (!strategy) {
      notifyError("No delete strategy for this page");
      return closeModal();
    }
    if (!hasBulkIds && !id) {
      notifyError(t("DeleteModalNothingSelected") || "Nothing selected");
      return closeModal();
    }

    try {
      setIsSubmitting(true);
      const message = await strategy.delete({
        id,
        ids,
        setIsCheck,
        setServiceId,
        title,
        category,
        isRestore,
      });
      setIsUpdate(true);
      notifySuccess(message || "Deleted");
      closeModal();
    } catch (err) {
      notifyError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={strategy?.getTitle?.(t, { isRestore }) || "Delete"}
      size="sm"
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {buildMessage(t, { id, ids, isRestore })}
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <SecondaryButton
          type="button"
          onClick={closeModal}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {t("common:cancel") || "Cancel"}
        </SecondaryButton>
        <PrimaryButton
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={isSubmitting}
          loading={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          <FiTrash2 className="h-4 w-4" />
          {isRestore ? t("Restore") || "Restore" : t("Delete") || "Delete"}
        </PrimaryButton>
      </div>
    </CModal>
  );
};

export default DeleteModal;
