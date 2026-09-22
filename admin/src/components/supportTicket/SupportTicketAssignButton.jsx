import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiUserCheck } from "react-icons/fi";

//internal import
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import SupportTicketServices from "@/services/SupportTicketServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

// Shared by SupportTicketTable.jsx (dashboard list) and
// SupportTicketDetail.jsx (detail page) â€” self-assign (PATCH /:id/assign
// with an empty body, backend defaults to the requesting agent) plus the
// "assigned to me / assigned to <agent>" display.
const SupportTicketAssignButton = ({
  ticketId,
  assignedTo,
  assigneeName,
  assigneeEmail,
  canAssign,
  onChanged,
  className = "",
}) => {
  const { t } = useTranslation();
  const {
    state: { adminInfo },
  } = useContext(AdminContext);
  const { setIsUpdate } = useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAssignedToMe = String(assignedTo) === String(adminInfo?._id);

  const handleSelfAssign = async () => {
    try {
      setIsSubmitting(true);
      await SupportTicketServices.assignTicket(ticketId);
      notifySuccess(t("SupportTicketAssignSuccess"));
      setIsUpdate(true);
      onChanged?.();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assignedTo) {
    return (
      <span className={`text-sm ${className}`}>
        {isAssignedToMe ? t("SupportTicketAssignedToMe") : assigneeName || assigneeEmail || "â€”"}
      </span>
    );
  }

  if (!canAssign) {
    return <span className={`text-sm text-gray-400 ${className}`}>â€”</span>;
  }

  return (
    <Button
      type="button"
      onClick={handleSelfAssign}
      disabled={isSubmitting}
      className={`flex items-center text-xs text-emerald-600 hover:text-emerald-700 ${className}`}
    >
      <FiUserCheck className="mr-1" size={14} />
      {t("SupportTicketAssignToMe")}
    </Button>
  );
};

export default SupportTicketAssignButton;
