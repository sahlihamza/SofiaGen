import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import { notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const PickupLocationModal = ({ location, countries, onClose, onSave }) => {
  const { t } = useTranslation();
  const isEditing = !!location;

  const [name, setName] = useState(location?.name || "");
  const [addressLine1, setAddressLine1] = useState(location?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(location?.addressLine2 || "");
  const [city, setCity] = useState(location?.city || "");
  const [postcode, setPostcode] = useState(location?.postcode || "");
  const [country, setCountry] = useState(location?.country || "");
  const [details, setDetails] = useState(location?.details || "");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = t("PickupLocationNameRequired");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        postcode: postcode.trim(),
        country,
        details: details.trim(),
        enabled: location?.enabled ?? true,
      });
      onClose();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-100"
        : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
    }`;

  return (
    <Modal isOpen onClose={onClose}>
      <ModalBody className="px-6 pt-6 pb-2">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isEditing ? t("PickupLocationEditModalTitle") : t("PickupLocationAddModalTitle")}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("PickupLocationNameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t("PickupLocationNamePlaceholder")}
              className={inputClass(errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("PickupLocationAddressLine1Label")}
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className={inputClass(false)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("PickupLocationAddressLine2Label")}
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className={inputClass(false)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("PickupLocationCityLabel")}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass(false)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
                {t("PickupLocationPostcodeLabel")}
              </label>
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                className={inputClass(false)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("PickupLocationCountryLabel")}
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass(false)}
            >
              <option value="">{t("PickupLocationCountryPlaceholder")}</option>
              {(countries || []).map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("PickupLocationDetailsLabel")}
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder={t("PickupLocationDetailsPlaceholder")}
              className={inputClass(false)}
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex justify-center gap-3">
        <Button className="!h-9 !w-32" layout="outline" onClick={onClose}>
          {t("CancelBtn")}
        </Button>
        <Button className="!h-9 !w-32" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting
            ? t("Processing")
            : isEditing
            ? t("ShippingMethodSaveBtn")
            : t("PickupLocationCreateBtn")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default PickupLocationModal;
