import React from "react";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import Tooltip from "@/components/tooltip/Tooltip";
import { IconButton } from "@sofia/ui";

const EditDeleteButtonTwo = ({
  extra,
  variant,
  handleRemoveVariant,
  attribute,
}) => {
  return (
    <>
      <div className="flex justify-end text-right items-center gap-1">
        {!attribute && (
          <IconButton
            type="button"
            aria-label="Edit"
            className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-0"
          >
            <Tooltip id="edit" Icon={FiEdit} title="Edit" bgColor="#14b8a6" />
          </IconButton>
        )}

        <IconButton
          type="button"
          onClick={() => handleRemoveVariant(variant, extra)}
          aria-label="Delete"
          className="p-2 cursor-pointer text-gray-400 hover:text-red-600 bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 border-0"
        >
          <Tooltip
            id="delete"
            Icon={FiTrash2}
            title="Delete"
            bgColor="#EF4444"
          />
        </IconButton>
      </div>
    </>
  );
};

export default EditDeleteButtonTwo;

