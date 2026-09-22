import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { FiMenu } from "react-icons/fi";

//internal import
import CStatusSwitch from "@/components/ui/CStatusSwitch";
import { Button } from "@sofia/ui";
const ITEM_TYPE = "PAYMENT_METHOD_ROW";

const PaymentMethodRow = ({
  method,
  index,
  title,
  description,
  moveRow,
  onDragEnd,
  togglingKey,
  toggleMethod,
  editingKey,
  openConfig,
  closeConfig,
  t,
}) => {
  const ref = useRef(null);

  const [{ handlerId }, drop] = useDrop({
    accept: ITEM_TYPE,
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover(item, monitor) {
      if (!ref.current) return;
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
    end: () => onDragEnd(),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div ref={ref} data-handler-id={handlerId} className={isDragging ? "opacity-40" : ""}>
      <div className="flex cursor-move flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <FiMenu className="h-4 w-4 shrink-0 text-gray-400 sm:mr-1" />

        <div className="sm:w-40 flex-shrink-0">
          <CStatusSwitch
            checked={!!method.enabled}
            disabled={togglingKey === method.key}
            onChange={(enabled) => toggleMethod(method.key, enabled)}
          />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>

        <div className="sm:flex-shrink-0">
          <Button
            type="button"
            onClick={() => (editingKey === method.key ? closeConfig() : openConfig(method.key))}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
          >
            {editingKey === method.key ? t("Close") : t("FinishSetup")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodRow;
