import React from "react";
import { CButton, ConfirmAction } from "@/components/ui";

/** Standard row actions for reusable data tables. */
const TableActions = ({
  onView,
  onEdit,
  onDelete,
  onArchive,
  disabled = false,
  deleteTitle = "Delete item",
  deleteDescription = "This action cannot be undone.",
  className = "",
}) => (
  <div className={`flex items-center justify-end gap-1 ${className}`} onClick={(event) => event.stopPropagation()}>
    {onView && <CButton iconOnly icon="eye" size="sm" variant="ghost" aria-label="View" onClick={onView} disabled={disabled} />}
    {onEdit && <CButton iconOnly icon="edit" size="sm" variant="ghost" aria-label="Edit" onClick={onEdit} disabled={disabled} />}
    {onArchive && <CButton iconOnly icon="archive" size="sm" variant="ghost" aria-label="Archive" onClick={onArchive} disabled={disabled} />}
    {onDelete && (
      <ConfirmAction
        asIconButton
        icon="trash"
        size="sm"
        variant="danger"
        aria-label="Delete"
        disabled={disabled}
        title={deleteTitle}
        description={deleteDescription}
        confirmText="Delete"
        onConfirm={onDelete}
      />
    )}
  </div>
);

export default TableActions;
