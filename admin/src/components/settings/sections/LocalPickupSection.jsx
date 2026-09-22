import { useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import SaveSettingsModal from "@/components/modal/SaveSettingsModal";
import ActionMenu from "@/components/table/ActionMenu";
import useLocalPickupSettingsSubmit from "@/hooks/useLocalPickupSettingsSubmit";
import usePickupLocationSubmit from "@/hooks/usePickupLocationSubmit";
import PickupLocationModal from "./PickupLocationModal";
import { Button } from "@sofia/ui";


const LocalPickupSection = ({ countries }) => {
  const { t } = useTranslation();

  const {
    isLoading: isGeneralLoading,
    isSubmitting: isGeneralSubmitting,
    isConfirmOpen,
    requestSave,
    closeConfirm,
    performSave,
    enabled,
    setEnabled,
    title,
    setTitle,
    hasPrice,
    setHasPrice,
    price,
    setPrice,
  } = useLocalPickupSettingsSubmit();

  const {
    pickupLocations,
    isLoading: isLocationsLoading,
    deletingId,
    togglingId,
    savePickupLocation,
    toggleEnabled,
    deletePickupLocation,
  } = usePickupLocationSubmit();

  const [locationModal, setLocationModal] = useState(null); // null | { location: PickupLocation|null }
  const [locationToDelete, setLocationToDelete] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {isConfirmOpen && (
          <SaveSettingsModal
            isOpen={isConfirmOpen}
            onClose={closeConfirm}
            onConfirm={performSave}
            isSubmitting={isGeneralSubmitting}
          />
        )}

        <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("LocalPickupGeneralTitle")}
        </h3>

        {isGeneralLoading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("ShippingSettingsLoading")}
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                {t("LocalPickupEnableTitle")}
              </label>
              <div className="sm:col-span-3">
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
                  />
                  {t("LocalPickupEnabledLabel")}
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 border-t border-gray-200 pt-6 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                {t("LocalPickupTitleFieldTitle")}
              </label>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-5 sm:grid-cols-12 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6 border-t border-gray-200 pt-6 dark:border-gray-700">
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:col-span-2">
                {t("LocalPickupPriceTitle")}
              </label>
              <div className="sm:col-span-3 flex flex-col gap-3">
                <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasPrice}
                    onChange={(e) => setHasPrice(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
                  />
                  {t("LocalPickupAddPriceLabel")}
                </label>
                {hasPrice && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full max-w-[160px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-700">
              <Button
                type="button"
                onClick={requestSave}
                disabled={isGeneralSubmitting}
                className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneralSubmitting ? t("Processing") : t("ShippingSettingsSaveBtn")}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("LocalPickupLocationsTitle")}
          </h3>
          <Button
            type="button"
            onClick={() => setLocationModal({ location: null })}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {t("PickupLocationAddBtn")}
          </Button>
        </div>

        {isLocationsLoading ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("ShippingClassLoading")}
          </div>
        ) : pickupLocations.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("PickupLocationListEmpty")}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            <div className="hidden gap-4 bg-gray-50 p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400 sm:grid sm:grid-cols-12">
              <div className="sm:col-span-7">{t("PickupLocationNameLabel")}</div>
              <div className="sm:col-span-2 text-center">{t("PickupLocationEnabledLabel")}</div>
              <div className="sm:col-span-3 text-right">{t("ShippingZoneActionsLabel")}</div>
            </div>

            {pickupLocations.map((location) => (
              <div
                key={location._id}
                className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-12 sm:items-center sm:gap-4"
              >
                <div className="sm:col-span-7">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {location.name}
                  </div>
                  {(location.addressLine1 || location.city) && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {[location.addressLine1, location.city, location.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex sm:col-span-2 sm:justify-center">
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={location.enabled}
                      disabled={togglingId === location._id}
                      onChange={() => toggleEnabled(location)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-600"
                    />
                  </label>
                </div>
                <div className="sm:col-span-3">
                  <ActionMenu
                    id={location._id}
                    title={location.name}
                    showDuplicate={false}
                    handleUpdate={() => setLocationModal({ location })}
                    handleModalOpen={() => setLocationToDelete(location)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {locationModal && (
        <PickupLocationModal
          location={locationModal.location}
          countries={countries}
          onClose={() => setLocationModal(null)}
          onSave={(payload) =>
            savePickupLocation(locationModal.location?._id || null, payload)
          }
        />
      )}

      {locationToDelete && (
        <Modal isOpen onClose={() => setLocationToDelete(null)}>
          <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
            <span className="flex justify-center text-3xl mb-6 text-red-500">
              <FiTrash2 />
            </span>
            <h2 className="text-xl font-medium mb-2">
              {t("DeleteModalH2")} <span className="text-red-500">{locationToDelete.name}</span>?
            </h2>
            <p>{t("DeleteModalPtag")}</p>
          </ModalBody>
          <ModalFooter className="justify-center">
            <Button
              className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
              layout="outline"
              onClick={() => setLocationToDelete(null)}
            >
              {t("modalKeepBtn")}
            </Button>
            <Button
              disabled={deletingId === locationToDelete._id}
              onClick={async () => {
                await deletePickupLocation(locationToDelete._id);
                setLocationToDelete(null);
              }}
              className="w-full h-12 sm:w-auto"
            >
              {deletingId === locationToDelete._id ? t("Processing") : t("modalDeletBtn")}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default LocalPickupSection;
