import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import ActionMenu from "@/components/table/ActionMenu";
import useShippingClassSubmit from "@/hooks/useShippingClassSubmit";
import ShippingClassModal from "./ShippingClassModal";
import { Button } from "@sofia/ui";

const ShippingClassesSection = () => {
  const { t } = useTranslation();
  const {
    shippingClasses,
    isLoading,
    deletingId,
    saveShippingClass,
    deleteShippingClass,
  } = useShippingClassSubmit();

  const [classModal, setClassModal] = useState(null); // null | { shippingClass: ShippingClass|null }
  const [classToDelete, setClassToDelete] = useState(null);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("ShippingClassesTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("ShippingClassesDesc")}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setClassModal({ shippingClass: null })}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          {t("ShippingClassAddBtn")}
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingClassLoading")}
        </div>
      ) : shippingClasses.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingClassListEmpty")}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          <div className="hidden gap-4 bg-gray-50 p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400 sm:grid sm:grid-cols-12">
            <div className="sm:col-span-3">{t("ShippingClassNameLabel")}</div>
            <div className="sm:col-span-2">{t("ShippingClassSlugLabel")}</div>
            <div className="sm:col-span-4">{t("ShippingClassDescriptionLabel")}</div>
            <div className="sm:col-span-1 text-center">{t("ShippingClassProductCountLabel")}</div>
            <div className="sm:col-span-2 text-right">{t("ShippingZoneActionsLabel")}</div>
          </div>

          {shippingClasses.map((shippingClass) => (
            <div
              key={shippingClass._id}
              className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 sm:col-span-3">
                {shippingClass.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 sm:col-span-2">
                {shippingClass.slug}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 sm:col-span-4">
                {shippingClass.description || (
                  <span className="italic text-gray-400 dark:text-gray-500">
                    {t("ShippingClassNoDescription")}
                  </span>
                )}
              </div>
              <div className="text-center text-sm text-gray-600 dark:text-gray-300 sm:col-span-1">
                {shippingClass.productCount ?? 0}
              </div>
              <div className="sm:col-span-2">
                <ActionMenu
                  id={shippingClass._id}
                  title={shippingClass.name}
                  showDuplicate={false}
                  handleUpdate={() => setClassModal({ shippingClass })}
                  handleModalOpen={() => setClassToDelete(shippingClass)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {classModal && (
        <ShippingClassModal
          shippingClass={classModal.shippingClass}
          onClose={() => setClassModal(null)}
          onSave={(payload) =>
            saveShippingClass(classModal.shippingClass?._id || null, payload)
          }
        />
      )}

      {classToDelete && (
        <Modal isOpen onClose={() => setClassToDelete(null)}>
          <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
            <span className="flex justify-center text-3xl mb-6 text-red-500">
              <FiTrash2 />
            </span>
            <h2 className="text-xl font-medium mb-2">
              {t("DeleteModalH2")} <span className="text-red-500">{classToDelete.name}</span>?
            </h2>
            <p>{t("DeleteModalPtag")}</p>
          </ModalBody>
          <ModalFooter className="justify-center">
            <Button
              className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
              layout="outline"
              onClick={() => setClassToDelete(null)}
            >
              {t("modalKeepBtn")}
            </Button>
            <Button
              disabled={deletingId === classToDelete._id}
              onClick={async () => {
                await deleteShippingClass(classToDelete._id);
                setClassToDelete(null);
              }}
              className="w-full h-12 sm:w-auto"
            >
              {deletingId === classToDelete._id ? t("Processing") : t("modalDeletBtn")}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default ShippingClassesSection;
