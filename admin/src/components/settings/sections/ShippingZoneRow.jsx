import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { FiInfo, FiMenu, FiGlobe, FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

//internal import
import ActionMenu from "@/components/table/ActionMenu";
import ShippingMethodModal from "./ShippingMethodModal";
import ShippingMethodPill from "./ShippingMethodPill";
import { Button } from "@sofia/ui";

const ITEM_TYPE = "SHIPPING_ZONE_ROW";
const VISIBLE_REGIONS_LIMIT = 1;
const ShippingZoneRow = ({
  zone,
  index,
  moveRow,
  onDragEnd,
  resolveCountryName,
  onShowRegions,
  onEdit,
  onDelete,
  onSaveMethod,
  onToggleMethod,
  onDeleteMethod,
  togglingMethodId,
  deletingMethodId,
  reorderingMethodsZoneId,
  reorderMethodsLocally,
  persistMethodOrder,
}) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [methodModal, setMethodModal] = useState(null); // null | { method: Method|null }
  const [methodToDelete, setMethodToDelete] = useState(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover(item, monitor) {
      if (!ref.current || zone.isDefault) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveRow(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({ index }),
    canDrag: () => !zone.isDefault,
    end: () => onDragEnd(),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`grid grid-cols-1 gap-2 p-4 sm:grid-cols-12 sm:items-center sm:gap-4 ${
        zone.isDefault ? "" : "cursor-move"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 sm:col-span-2">
        {zone.isDefault ? (
          <FiGlobe className="h-4 w-4 shrink-0 text-gray-400" title={t("ShippingZoneDefaultNoRegions")} />
        ) : (
          <FiMenu className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        {zone.name}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        {zone.countries?.length ? (
          <>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
              {resolveCountryName(zone.countries[0])}
            </span>
            {zone.countries.length > VISIBLE_REGIONS_LIMIT && (
              <Button
                type="button"
                onClick={() =>
                  onShowRegions({
                    name: zone.name,
                    regionNames: zone.countries.map(resolveCountryName),
                  })
                }
                className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                +{zone.countries.length - VISIBLE_REGIONS_LIMIT}
                <FiInfo className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {t("ShippingZoneAllRegions")}
          </span>
        )}
      </div>
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto sm:col-span-5">
        {zone.methods?.length ? (
          zone.methods.map((method, methodIndex) => (
            <ShippingMethodPill
              key={method._id}
              zoneId={zone._id}
              method={method}
              index={methodIndex}
              isDefault={
                method._id === zone.methods.find((m) => m.enabled)?._id
              }
              moveMethod={(dragIndex, hoverIndex) =>
                reorderMethodsLocally(zone._id, dragIndex, hoverIndex)
              }
              onDragEnd={() => persistMethodOrder(zone._id)}
              onToggle={(m) => onToggleMethod(zone._id, m)}
              onEdit={(m) => setMethodModal({ method: m })}
              onDeleteRequest={setMethodToDelete}
              togglingMethodId={togglingMethodId}
              deletingMethodId={deletingMethodId}
              disabled={reorderingMethodsZoneId === zone._id}
              t={t}
            />
          ))
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("ShippingMethodNoMethods")}
          </span>
        )}
        <Button
          type="button"
          title={t("ShippingMethodAddBtn")}
          onClick={() => setMethodModal({ method: null })}
          className="flex shrink-0 items-center rounded-full border border-dashed border-gray-300 p-1 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-gray-600 dark:text-gray-400"
        >
          <FiPlus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="sm:col-span-2">
        <ActionMenu
          id={zone._id}
          title={zone.name}
          showDuplicate={false}
          showDelete={!zone.isDefault}
          handleUpdate={() => onEdit(zone)}
          handleModalOpen={() => onDelete(zone)}
        />
      </div>

      {methodModal && (
        <ShippingMethodModal
          zone={zone}
          method={methodModal.method}
          onClose={() => setMethodModal(null)}
          onSave={(payload) =>
            onSaveMethod(zone._id, methodModal.method?._id || null, payload)
          }
        />
      )}

      {methodToDelete && (
        <Modal isOpen onClose={() => setMethodToDelete(null)}>
          <ModalBody className="text-center custom-modal px-8 pt-6 pb-4">
            <span className="flex justify-center text-3xl mb-6 text-red-500">
              <FiTrash2 />
            </span>
            <h2 className="text-xl font-medium mb-2">
              {t("DeleteModalH2")} <span className="text-red-500">{methodToDelete.title}</span>?
            </h2>
            <p>{t("DeleteModalPtag")}</p>
          </ModalBody>
          <ModalFooter className="justify-center">
            <Button
              className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
              layout="outline"
              onClick={() => setMethodToDelete(null)}
            >
              {t("modalKeepBtn")}
            </Button>
            <Button
              disabled={deletingMethodId === methodToDelete._id}
              onClick={async () => {
                await onDeleteMethod(zone._id, methodToDelete._id);
                setMethodToDelete(null);
              }}
              className="w-full h-12 sm:w-auto"
            >
              {deletingMethodId === methodToDelete._id
                ? t("Processing")
                : t("modalDeletBtn")}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default ShippingZoneRow;
