import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiTruck, FiGift, FiInfo } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import { notifyError } from "@/utils/toast";
import { getShippingMethodDisplayTitle } from "@/utils/shippingMethods";
import { Button } from "@sofia/ui";

const TYPE_OPTIONS = [
  {
    type: "flat_rate",
    Icon: FiTruck,
    labelKey: "ShippingMethodTypeFlatRate",
    descKey: "ShippingMethodTypeFlatRateDesc",
  },
  {
    type: "free_shipping",
    Icon: FiGift,
    labelKey: "ShippingMethodTypeFreeShipping",
    descKey: "ShippingMethodTypeFreeShippingDesc",
  },
];

const defaultTitleForType = (type, t) =>
  type === "free_shipping"
    ? t("ShippingMethodTypeFreeShipping")
    : t("ShippingMethodTypeFlatRate");

const FREE_SHIPPING_REQUIREMENT_OPTIONS = [
  "no_requirement",
  "coupon",
  "min_amount",
  "min_amount_or_coupon",
  "min_amount_and_coupon",
];

const REQUIRES_MIN_AMOUNT = ["min_amount", "min_amount_or_coupon", "min_amount_and_coupon"];
const REQUIRES_COUPON = ["coupon", "min_amount_or_coupon", "min_amount_and_coupon"];

const ShippingMethodModal = ({ zone, method, onClose, onSave }) => {
  const { t } = useTranslation();
  const isEditing = !!method;

  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [type, setType] = useState(method?.type || null);
  const [title, setTitle] = useState(
    method ? getShippingMethodDisplayTitle(method, t) : ""
  );
  const [cost, setCost] = useState(
    method?.cost !== undefined ? String(method.cost) : "0"
  );
  const [taxStatus, setTaxStatus] = useState(method?.taxStatus || "taxable");
  const [minOrderAmount, setMinOrderAmount] = useState(
    method?.minOrderAmount !== null && method?.minOrderAmount !== undefined
      ? String(method.minOrderAmount)
      : ""
  );
  const [freeShippingRequirement, setFreeShippingRequirement] = useState(
    method?.freeShippingRequirement || "no_requirement"
  );
  const [applyMinBeforeCouponDiscount, setApplyMinBeforeCouponDiscount] = useState(
    !!method?.applyMinBeforeCouponDiscount
  );
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usedTypes = (zone?.methods || [])
    .filter((existing) => existing._id !== method?._id)
    .map((existing) => existing.type);

  const chooseType = (selectedType) => {
    if (usedTypes.includes(selectedType)) return;
    setType(selectedType);
    if (!title.trim()) {
      setTitle(defaultTitleForType(selectedType, t));
    }
  };

  const goToStep2 = () => {
    if (!type) return;
    setStep(2);
  };

  const requiresMinAmount =
    type === "free_shipping" && REQUIRES_MIN_AMOUNT.includes(freeShippingRequirement);
  const requiresCoupon =
    type === "free_shipping" && REQUIRES_COUPON.includes(freeShippingRequirement);

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!title.trim()) {
      nextErrors.title = t("ShippingMethodTitleRequired");
    }
    if (type === "flat_rate" && (cost === "" || Number.isNaN(Number(cost)) || Number(cost) < 0)) {
      nextErrors.cost = t("ShippingMethodCostRequired");
    }
    if (
      requiresMinAmount &&
      (minOrderAmount === "" || Number.isNaN(Number(minOrderAmount)) || Number(minOrderAmount) < 0)
    ) {
      nextErrors.minOrderAmount = t("ShippingMethodMinOrderRequired");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      type,
      title: title.trim(),
      enabled: method?.enabled ?? true,
      cost: type === "flat_rate" ? Number(cost) || 0 : 0,
      taxStatus: type === "flat_rate" ? taxStatus : "taxable",
      freeShippingRequirement:
        type === "free_shipping" ? freeShippingRequirement : "no_requirement",
      minOrderAmount: requiresMinAmount && minOrderAmount !== "" ? Number(minOrderAmount) : null,
      applyMinBeforeCouponDiscount: requiresMinAmount && applyMinBeforeCouponDiscount,
    };

    setIsSubmitting(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <ModalBody className="px-6 pt-6 pb-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing
              ? t("ShippingMethodEditModalTitle")
              : t("ShippingMethodCreateModalTitle")}
          </h2>
          {!isEditing && (
            <span className="text-xs font-medium text-gray-400">
              {step === 1
                ? t("ShippingMethodTypeStepLabel")
                : t("ShippingMethodConfigureStepLabel")}
            </span>
          )}
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            {TYPE_OPTIONS.map(({ type: optType, Icon, labelKey, descKey }) => {
              const isUsed = usedTypes.includes(optType);
              return (
                <Button
                  key={optType}
                  type="button"
                  disabled={isUsed}
                  onClick={() => chooseType(optType)}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                    isUsed
                      ? "cursor-not-allowed border-gray-100 opacity-50 dark:border-gray-700"
                      : type === optType
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-gray-200 hover:border-emerald-300 dark:border-gray-600"
                  }`}
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {t(labelKey)}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {isUsed ? t("ShippingMethodTypeAlreadyUsed") : t(descKey)}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("ShippingMethodTitleLabel")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
                  errors.title
                    ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
                }`}
              />
              {errors.title ? (
                <p className="mt-1 text-xs text-red-500">{errors.title}</p>
              ) : (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("ShippingMethodTitleHelp")}
                </p>
              )}
            </div>

            {type === "flat_rate" && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {t("productForm.taxStatus")}
                </label>
                <select
                  value={taxStatus}
                  onChange={(e) => setTaxStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="taxable">{t("productForm.taxable")}</option>
                  <option value="none">{t("productForm.none")}</option>
                </select>
              </div>
            )}

            {type === "flat_rate" && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                  {t("ShippingMethodCostLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => {
                    setCost(e.target.value);
                    setErrors((prev) => ({ ...prev, cost: undefined }));
                  }}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
                    errors.cost
                      ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                      : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
                  }`}
                />
                {errors.cost && (
                  <p className="mt-1 text-xs text-red-500">{errors.cost}</p>
                )}
              </div>
            )}

            {type === "free_shipping" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {t("ShippingMethodRequiresLabel")}
                  </label>
                  <select
                    value={freeShippingRequirement}
                    onChange={(e) => {
                      setFreeShippingRequirement(e.target.value);
                      setErrors((prev) => ({ ...prev, minOrderAmount: undefined }));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {FREE_SHIPPING_REQUIREMENT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`ShippingMethodRequirement_${option}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {requiresCoupon && (
                  <div className="flex items-start gap-2 rounded-md bg-indigo-50 p-3 text-xs text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-200">
                    <FiInfo className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {t("ShippingMethodCouponNoteText")}{" "}
                      <Link to="/coupons" className="font-semibold underline">
                        {t("ShippingMethodCouponNoteLink")}
                      </Link>
                    </span>
                  </div>
                )}

                {requiresMinAmount && (
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {t("ShippingMethodMinOrderLabel")} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minOrderAmount}
                      onChange={(e) => {
                        setMinOrderAmount(e.target.value);
                        setErrors((prev) => ({ ...prev, minOrderAmount: undefined }));
                      }}
                      className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
                        errors.minOrderAmount
                          ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                          : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
                      }`}
                    />
                    {errors.minOrderAmount ? (
                      <p className="mt-1 text-xs text-red-500">{errors.minOrderAmount}</p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("ShippingMethodMinOrderHelp")}
                      </p>
                    )}
                  </div>
                )}

                {requiresMinAmount && (
                  <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={applyMinBeforeCouponDiscount}
                      onChange={(e) => setApplyMinBeforeCouponDiscount(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
                    />
                    {t("ShippingMethodApplyMinBeforeCoupon")}
                  </label>
                )}
              </>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="flex justify-center gap-3">
        {step === 1 ? (
          <>
            <Button className="!h-9 !w-32" layout="outline" onClick={onClose}>
              {t("CancelBtn")}
            </Button>
            <Button className="!h-9 !w-32" disabled={!type} onClick={goToStep2}>
              {t("ShippingMethodContinueBtn")}
            </Button>
          </>
        ) : (
          <>
            <Button
              className="!h-9 !w-32"
              layout="outline"
              onClick={isEditing ? onClose : () => setStep(1)}
            >
              {isEditing ? t("CancelBtn") : t("ShippingMethodBackBtn")}
            </Button>
            <Button
              className="!h-9 !w-32"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? t("Processing") : t("ShippingMethodSaveBtn")}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ShippingMethodModal;
