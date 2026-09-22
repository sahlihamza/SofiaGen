import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";

//internal import
import CheckBox from "@/components/form/others/CheckBox";
import SupportTicketStatusControl from "./SupportTicketStatusControl";
import SupportTicketAssignButton from "./SupportTicketAssignButton";
import { PRIORITY_STYLES, SLA_BADGE, priorityLabelKey, formatDateTime } from "./supportTicketConstants";

const SupportTicketTable = ({ tickets, isCheck, setIsCheck, canAssign, canUpdateStatus }) => {
  const { t } = useTranslation();
  const history = useHistory();

  const handleCheck = (e) => {
    const { id, checked } = e.target;
    if (checked) {
      setIsCheck([...isCheck, id]);
    } else {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  const handleRowClick = (ticketId) => {
    history.push(`/support-tickets/${ticketId}`);
  };

  return (
    <TableBody>
      {tickets?.map((ticket) => {
        const sla = SLA_BADGE[ticket.slaStatus] || SLA_BADGE.ok;

        return (
          <TableRow
            key={ticket._id}
            onClick={() => handleRowClick(ticket._id)}
            className="cursor-pointer"
          >
            <TableCell onClick={(e) => e.stopPropagation()}>
              <CheckBox
                type="checkbox"
                name={ticket.ticketNumber}
                id={ticket._id}
                handleClick={handleCheck}
                isChecked={isCheck?.includes(ticket._id)}
              />
            </TableCell>

            <TableCell>
              <span className="text-sm font-semibold">{ticket.ticketNumber}</span>
            </TableCell>

            <TableCell>
              <span className="text-sm truncate max-w-[220px] block">{ticket.subject}</span>
            </TableCell>

            <TableCell>
              <span className="text-sm block">{ticket.creatorName || ticket.creatorEmail || ""}</span>
              {ticket.creatorName && ticket.creatorEmail && (
                <span className="text-xs text-gray-400 block">{ticket.creatorEmail}</span>
              )}
            </TableCell>

            <TableCell>
              <span className="text-sm">{ticket.categoryName || ""}</span>
            </TableCell>

            <TableCell className="text-center">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.normal
                }`}
              >
                {t(priorityLabelKey(ticket.priority))}
              </span>
            </TableCell>

            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
              <SupportTicketStatusControl
                ticketId={ticket._id}
                status={ticket.status}
                canUpdateStatus={canUpdateStatus}
              />
            </TableCell>

            <TableCell className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${sla.className}`}
                title={t(sla.labelKey)}
              >
                {sla.icon}
              </span>
            </TableCell>

            <TableCell onClick={(e) => e.stopPropagation()}>
              <SupportTicketAssignButton
                ticketId={ticket._id}
                assignedTo={ticket.assignedTo}
                assigneeName={ticket.assigneeName}
                assigneeEmail={ticket.assigneeEmail}
                canAssign={canAssign}
              />
            </TableCell>

            <TableCell>
              <span className="text-sm">{formatDateTime(ticket.createdAt)}</span>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  );
};

export default SupportTicketTable;
