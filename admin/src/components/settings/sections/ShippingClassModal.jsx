import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import { notifyError } from "@/utils/toast";
import { Button } from "@sofia/ui";

const ShippingClassModal = ({ shippingClass, onClose, onSave }) => {
  const { t } = useTranslation();
  const isEditing = !!shippingClass;

  const [name, setName] = useState(shippingClass?.name || "");
  const [slug, setSlug] = useState(shippingClass?.slug || "");
  const [description, setDescription] = useState(shippingClass?.description || "");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!name.trim()) {
      nextErrors.name = t("ShippingClassNameRequired");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
      });
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isEditing ? t("ShippingClassEditModalTitle") : t("ShippingClassAddModalTitle")}
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("ShippingClassNameLabel")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t("ShippingClassNamePlaceholder")}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
                errors.name
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
              }`}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("ShippingClassNameHelp")}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("ShippingClassSlugLabel")}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("ShippingClassSlugPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("ShippingClassSlugHelp")}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("ShippingClassDescriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("ShippingClassDescriptionPlaceholder")}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
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
            : t("ShippingClassCreateBtn")}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ShippingClassModal;
