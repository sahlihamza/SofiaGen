import { useEffect, useMemo, useState } from "react";
import Multiselect from "multiselect-react-dropdown";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FiChevronDown, FiTrash2 } from "react-icons/fi";
import { Modal, ModalBody, ModalFooter, Pagination, TableFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import { EVERYWHERE_ISO2, countryOptionLabel } from "@/utils/countryOptionLabel";
import ShippingZoneRow from "./ShippingZoneRow";
import { Button } from "@sofia/ui";

const PAGE_SIZE = 5;

const ShippingZonesSection = ({
  countries,
  shippingZones,
  isLoading,
  isSubmitting,
  name,
  setName,
  selectedCountries,
  setSelectedCountries,
  zipCodes,
  setZipCodes,
  errors,
  onSubmit,
  isReordering,
  deletingId,
  editingZoneId,
  startEditZone,
  cancelEditZone,
  deleteZone,
  reorderLocally,
  persistZoneOrder,
  saveShippingMethod,
  toggleShippingMethod,
  deleteShippingMethodItem,
  togglingMethodId,
  deletingMethodId,
  reorderingMethodsZoneId,
  reorderMethodsLocally,
  persistMethodOrder,
}) => {
  const { t } = useTranslation();
  const [zoneForRegionsInfo, setZoneForRegionsInfo] = useState(null);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(shippingZones.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageOffset = (page - 1) * PAGE_SIZE;
  const paginatedZones = shippingZones.slice(pageOffset, pageOffset + PAGE_SIZE);
  const moveRow = (dragIndex, hoverIndex) => {
    reorderLocally(pageOffset + dragIndex, pageOffset + hoverIndex);
  };

  const countryNameByIso2 = useMemo(
    () => new Map((countries || []).map((country) => [country.iso2, country.name])),
    [countries]
  );

  const resolveCountryName = (iso2) => countryNameByIso2.get(iso2) || iso2;

  const regionOptions = useMemo(
    () => [
      { iso2: EVERYWHERE_ISO2, name: t("ShippingZoneEverywhereOption") },
      ...(countries || []),
    ],
    [countries, t]
  );
  const isEverywhereSelected =
    (countries?.length || 0) > 0 && selectedCountries.length === countries.length;

  const handleSelectCountry = (selectedList, selectedItem) => {
    if (selectedItem?.iso2 === EVERYWHERE_ISO2) {
      setSelectedCountries(countries || []);
      return;
    }
    if (isEverywhereSelected) {
      setSelectedCountries([selectedItem]);
      return;
    }
    setSelectedCountries(selectedList);
  };

  const displaySelectedCountries = isEverywhereSelected
    ? [{ iso2: EVERYWHERE_ISO2, name: t("ShippingZoneEverywhereOption") }]
    : selectedCountries;

  const editingZone = editingZoneId
    ? shippingZones.find((zone) => zone._id === editingZoneId)
    : null;
  const isEditingDefaultZone = !!editingZone?.isDefault;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("ShippingZonesTitle")}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingZonesDesc")}
        </p>
      </div>

      {editingZoneId && (
        <div className="mb-3 rounded-md bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
          {t("ShippingZoneEditingBanner")}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-md border border-gray-200 p-4 dark:border-gray-700 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("ShippingZoneNameLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("ShippingZoneNamePlaceholder")}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
              errors?.name
                ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
            }`}
          />
          {errors?.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        {isEditingDefaultZone ? (
          <div className="flex items-end">
            <p className="text-xs italic text-gray-500 dark:text-gray-400">
              {t("ShippingZoneDefaultNoRegions")}
            </p>
          </div>
        ) : (
          <div className="country-multiselect">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("ShippingZoneRegionsLabel")} <span className="text-red-500">*</span>
            </label>
            <Multiselect
              options={regionOptions}
              selectedValues={displaySelectedCountries}
              displayValue="name"
              isObject={true}
              onSelect={handleSelectCountry}
              onRemove={setSelectedCountries}
              placeholder={t("ShippingZoneRegionsPlaceholder")}
              optionValueDecorator={countryOptionLabel}
              selectedValueDecorator={countryOptionLabel}
              showArrow={true}
              customArrow={<FiChevronDown className="w-4 h-4 text-gray-400" />}
            />
            {errors?.selectedCountries && (
              <p className="mt-1 text-xs text-red-500">{errors.selectedCountries}</p>
            )}
          </div>
        )}

        {!isEditingDefaultZone && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-gray-600 dark:text-gray-400">
              {t("ShippingZoneZipCodesLabel")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={zipCodes}
              onChange={(e) => setZipCodes(e.target.value)}
              rows={3}
              placeholder={t("ShippingZoneZipCodesPlaceholder")}
              className={`w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 dark:bg-gray-700 dark:text-gray-200 ${
                errors?.zipCodes
                  ? "border-red-500 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 dark:border-gray-600"
              }`}
            />
            {errors?.zipCodes ? (
              <p className="mt-1 text-xs text-red-500">{errors.zipCodes}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("ShippingZoneZipCodesHelp")}
              </p>
            )}
          </div>
        )}

        <div className="sm:col-span-2 flex justify-end gap-2">
          {editingZoneId && (
            <Button
              type="button"
              onClick={cancelEditZone}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("CancelBtn")}
            </Button>
          )}
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t("Processing")
              : editingZoneId
              ? t("ShippingZoneUpdateBtn")
              : t("ShippingZoneAddBtn")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingZoneLoading")}
        </div>
      ) : shippingZones.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t("ShippingZoneListEmpty")}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
          <div className="hidden gap-4 bg-gray-50 p-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400 sm:grid sm:grid-cols-12">
            <div className="sm:col-span-2">{t("ShippingZoneNameLabel")}</div>
            <div className="sm:col-span-3">{t("ShippingZoneRegionsLabel")}</div>
            <div className="sm:col-span-5">{t("ShippingZoneMethodsLabel")}</div>
            <div className="sm:col-span-2 text-right">{t("ShippingZoneActionsLabel")}</div>
          </div>

          <DndProvider backend={HTML5Backend}>
            {paginatedZones.map((zone, index) => (
              <ShippingZoneRow
                key={index}
                zone={zone}
                index={index}
                moveRow={moveRow}
                onDragEnd={persistZoneOrder}
                resolveCountryName={resolveCountryName}
                onShowRegions={setZoneForRegionsInfo}
                onEdit={startEditZone}
                onDelete={setZoneToDelete}
                onSaveMethod={saveShippingMethod}
                onToggleMethod={toggleShippingMethod}
                onDeleteMethod={deleteShippingMethodItem}
                togglingMethodId={togglingMethodId}
                deletingMethodId={deletingMethodId}
                reorderingMethodsZoneId={reorderingMethodsZoneId}
                reorderMethodsLocally={reorderMethodsLocally}
                persistMethodOrder={persistMethodOrder}
              />
            ))}
          </DndProvider>
        </div>
      )}

      {isReordering && (
        <p className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
          {t("ShippingZoneReordering")}
        </p>
      )}

      {!isLoading && shippingZones.length > PAGE_SIZE && (
        <TableFooter>
          <Pagination
            totalResults={shippingZones.length}
            resultsPerPage={PAGE_SIZE}
            onChange={setPage}
            label="Shipping zones navigation"
          />
        </TableFooter>
      )}

      {zoneForRegionsInfo && (
        <Modal isOpen onClose={() => setZoneForRegionsInfo(null)}>
          <h1 className="text-xl font-medium text-center pb-6 dark:text-gray-300">
            {t("ShippingZoneRegionsModalTitle")}{" "}
            <span className="text-emerald-600">{zoneForRegionsInfo.name}</span>
          </h1>
          <ModalBody>
            <div className="flex flex-wrap gap-2 justify-center pb-4">
              {zoneForRegionsInfo.regionNames.map((regionName, index) => (
                <span
                  key={index}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                >
                  {regionName}
                </span>
              ))}
            </div>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button
              className="w-full sm:w-auto bg-red-400 text-white hover:bg-red-500"
              layout="delete"
              onClick={() => setZoneForRegionsInfo(null)}
            >
              {t("UserRolesInfoModalClose")}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {zoneToDelete && (
        <Modal isOpen onClose={() => setZoneToDelete(null)}>
          <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
            <span className="flex justify-center text-3xl mb-6 text-red-500">
              <FiTrash2 />
            </span>
            <h2 className="text-xl font-medium mb-2">
              {t("DeleteModalH2")} <span className="text-red-500">{zoneToDelete.name}</span>?
            </h2>
            <p>{t("DeleteModalPtag")}</p>
          </ModalBody>
          <ModalFooter className="justify-center">
            <Button
              className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
              layout="outline"
              onClick={() => setZoneToDelete(null)}
            >
              {t("modalKeepBtn")}
            </Button>
            <Button
              disabled={deletingId === zoneToDelete._id}
              onClick={async () => {
                await deleteZone(zoneToDelete._id);
                setZoneToDelete(null);
              }}
              className="w-full h-12 sm:w-auto"
            >
              {deletingId === zoneToDelete._id ? t("Processing") : t("modalDeletBtn")}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default ShippingZonesSection;
