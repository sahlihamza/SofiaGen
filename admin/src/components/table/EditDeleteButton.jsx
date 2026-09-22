import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiEdit, FiTrash2, FiZoomIn } from "react-icons/fi";
import Tooltip from "@/components/tooltip/Tooltip";
import { IconButton } from "@sofia/ui";

const EditDeleteButton = ({
  id,
  title,
  handleUpdate,
  handleModalOpen,
  isCheck,
  product,
  parent,
  children,
  showEdit = true,
  showDelete = true,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-end text-right items-center gap-1">
        {children?.length > 0 && (
          <Link
            to={`/categories/${parent?._id}`}
            className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none"
          >
            <Tooltip
              id="view"
              Icon={FiZoomIn}
              title={t("View")}
              bgColor="#10B981"
            />
          </Link>
        )}

        {showEdit && (
          <IconButton
            disabled={isCheck?.length > 0}
            onClick={() => handleUpdate(id)}
            aria-label={t("Edit")}
            className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 focus:outline-none bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-0"
          >
            <Tooltip
              id="edit"
              Icon={FiEdit}
              title={t("Edit")}
              bgColor="#10B981"
            />
          </IconButton>
        )}

        {showDelete && (
          <IconButton
            disabled={isCheck?.length > 0}
            onClick={() => handleModalOpen(id, title, product)}
            aria-label={t("Delete")}
            className="p-2 cursor-pointer text-gray-400 hover:text-red-600 focus:outline-none bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 border-0"
          >
            <Tooltip
              id="delete"
              Icon={FiTrash2}
              title={t("Delete")}
              bgColor="#EF4444"
            />
          </IconButton>
        )}
      </div>
    </>
  );
};

export default EditDeleteButton;

