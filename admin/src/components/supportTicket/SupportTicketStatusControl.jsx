import { Select } from "@windmill/react-ui";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import SupportTicketServices from "@/services/SupportTicketServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { ALLOWED_STATUS_TRANSITIONS, STATUS_STYLES, STATUS_LABEL_KEY } from "./supportTicketConstants";

// Shared by SupportTicketTable.jsx (dashboard list) and
// SupportTicketDetail.jsx (detail page)  one inline <select> that only ever
// offers the transitions legal from the ticket's current status, backed by
// the same PATCH /:id/status call either way.
const SupportTicketStatusControl = ({ ticketId, status, canUpdateStatus, onChanged, className = "" }) => {
  const { t } = useTranslation();
  const { setIsUpdate } = useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[status] || [];

  const handleChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus) return;
    try {
      setIsSubmitting(true);
      await SupportTicketServices.changeStatus(ticketId, newStatus);
      notifySuccess(t("SupportTicketStatusChangeSuccess"));
      setIsUpdate(true);
      onChanged?.(newStatus);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canUpdateStatus || nextStatuses.length === 0) {
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          STATUS_STYLES[status] || STATUS_STYLES.open
        } ${className}`}
      >
        {t(STATUS_LABEL_KEY[status] || status)}
      </span>
    );
  }

  return (
    <Select value="" onChange={handleChange} disabled={isSubmitting} className={`text-xs py-1 ${className}`}>
      <option value="" disabled>
        {t(STATUS_LABEL_KEY[status] || status)}
      </option>
      {nextStatuses.map((s) => (
        <option key={s} value={s}>
          {t(STATUS_LABEL_KEY[s] || s)}
        </option>
      ))}
    </Select>
  );
};

export default SupportTicketStatusControl;
