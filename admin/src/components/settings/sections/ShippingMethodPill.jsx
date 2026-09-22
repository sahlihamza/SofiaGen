import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { FiX, FiToggleLeft, FiToggleRight, FiMenu } from "react-icons/fi";

//internal import
import { getShippingMethodDisplayTitle } from "@/utils/shippingMethods";
import { Button } from "@sofia/ui";

const ITEM_TYPE = "SHIPPING_METHOD_PILL";
const ShippingMethodPill = ({
  zoneId,
  method,
  index,
  isDefault,
  moveMethod,
  onDragEnd,
  onToggle,
  onEdit,
  onDeleteRequest,
  togglingMethodId,
  deletingMethodId,
  disabled,
  t,
}) => {
  const ref = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover(item, monitor) {
      if (!ref.current || item.zoneId !== zoneId) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveMethod(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => ({ zoneId, index }),
    end: () => onDragEnd(),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      className={`flex shrink-0 cursor-move items-center gap-1 rounded-full bg-gray-100 py-1 pl-1 pr-2 text-xs dark:bg-gray-700 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <FiMenu className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <Button
        type="button"
        title={method.enabled ? t("Enabled") : t("Disabled")}
        disabled={disabled || togglingMethodId === method._id}
        onClick={() => onToggle(method)}
        className={`rounded-full p-0.5 disabled:opacity-40 ${
          method.enabled ? "text-emerald-600" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {method.enabled ? (
          <FiToggleRight className="h-4 w-4" />
        ) : (
          <FiToggleLeft className="h-4 w-4" />
        )}
      </Button>
      <Button
        type="button"
        onClick={() => onEdit(method)}
        className={`whitespace-nowrap font-semibold hover:underline ${
          method.enabled ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {getShippingMethodDisplayTitle(method, t)}
      </Button>
      {isDefault && (
        <span
          title={t("ShippingMethodDefaultHint")}
          className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          {t("ShippingMethodDefaultBadge")}
        </span>
      )}
      <Button
        type="button"
        title={t("Delete")}
        disabled={disabled || deletingMethodId === method._id}
        onClick={() => onDeleteRequest(method)}
        className="text-gray-400 hover:text-red-500 disabled:opacity-40"
      >
        <FiX className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default ShippingMethodPill;
