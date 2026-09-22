import { Card, CardBody, Textarea } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import useGetCData from "@/hooks/useGetCData";
import SupportTicketServices from "@/services/SupportTicketServices";
import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import SupportTicketStatusControl from "@/components/supportTicket/SupportTicketStatusControl";
import SupportTicketAssignButton from "@/components/supportTicket/SupportTicketAssignButton";
import { PRIORITY_STYLES, priorityLabelKey, formatDateTime } from "@/components/supportTicket/supportTicketConstants";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

// SFG-80 SUPPORT-3/dashboard: this admin app is staff-only â€” there is no

// customer-auth mode here (see SupportTicketServices.js's header comment),
// so the "if the current user is a customer" branch from the ticket spec
// has nothing to attach to yet. Every reader of this page is an agent, so
// the internal-note toggle is always available and rating a message (a
// customer-only action per ticketMessageService.rateMessage) has no control
// here at all â€” building one an agent could click would let agents rate

// each other's messages, which isn't the feature.
const SupportTicketDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const history = useHistory();
  const { setIsUpdate } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const canUpdateTicket = hasPermission("support ticket", "update");
  const canAssignTicket = hasPermission("support ticket", "assign");
  const canReply = hasPermission("support ticket", "reply");

  const { data, loading, error } = useAsync(() => SupportTicketServices.getTicketDetail(id));
  const ticket = data?.data?.ticket;
  const messages = data?.data?.messages || [];

  const [content, setContent] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSolution, setIsSolution] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      setIsSubmitting(true);
      await SupportTicketServices.addMessage(id, {
        content: content.trim(),
        isInternalNote,
        // isSolution only makes sense on a public agent reply â€” the backend

        // ignores it otherwise, but there's no reason to even offer it.
        isSolution: !isInternalNote && isSolution,
      });
      notifySuccess(t("SupportTicketMessageSentSuccess"));
      setContent("");
      setIsInternalNote(false);
      setIsSolution(false);
      // "Simple refetch after success" per the ticket â€” no websocket/live

      // thread for this pass.
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Loading loading={loading} />;
  if (error) return <span className="text-center mx-auto text-red-500 block mt-10">{error}</span>;
  if (!ticket) return <span className="text-center mx-auto block mt-10">{t("SupportTicketNotFound")}</span>;

  const sla = ticket.slaStatus;

  return (
    <>
      <PageTitle>{ticket.ticketNumber}</PageTitle>

      <Button
        type="button"
        layout="link"
        onClick={() => history.push("/support-tickets")}
        className="flex items-center text-sm text-gray-500 hover:text-emerald-600 mb-4 p-0"
      >
        <FiArrowLeft className="mr-1" />
        {t("SupportTicketBackToList")}
      </Button>


      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">{ticket.subject}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.normal
                  }`}
                >
                  {t(priorityLabelKey(ticket.priority))}
                </span>
                <SupportTicketStatusControl
                  ticketId={ticket._id}
                  status={ticket.status}
                  canUpdateStatus={canUpdateTicket}
                />
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    sla === "overdue"
                      ? "bg-red-50 text-red-600"
                      : sla === "warning"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {sla === "overdue" ? "ðŸ”´" : sla === "warning" ? "âš ï¸" : "âœ“"}{" "}

                  {t(`SupportTicketSla${sla.charAt(0).toUpperCase()}${sla.slice(1)}`)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">{t("SupportTicketTblAssignedTo")}</div>
              <SupportTicketAssignButton
                ticketId={ticket._id}
                assignedTo={ticket.assignedTo}
                assigneeName={ticket.assigneeName}
                assigneeEmail={ticket.assigneeEmail}
                canAssign={canAssignTicket}
              />
            </div>
          </div>

          <hr className="my-4 border-gray-100 dark:border-gray-700" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">{t("SupportTicketTblCustomer")}</div>
              <div className="font-medium">{ticket.creatorName || ticket.creatorEmail || "â€”"}</div>

              {ticket.creatorName && ticket.creatorEmail && (
                <div className="text-xs text-gray-400">{ticket.creatorEmail}</div>
              )}
            </div>
            <div>
              <div className="text-gray-500">{t("SupportTicketTblCategory")}</div>
              <div className="font-medium">{ticket.categoryName || "â€”"}</div>

            </div>
            <div>
              <div className="text-gray-500">{t("SupportTicketTblCreatedAt")}</div>
              <div className="font-medium">{formatDateTime(ticket.createdAt)}</div>
            </div>
          </div>

          <div className="mt-4 text-sm">
            <div className="text-gray-500">{t("SupportTicketDescriptionLabel")}</div>
            <p className="font-medium whitespace-pre-wrap">{ticket.description}</p>
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <h3 className="text-md font-semibold mb-4">{t("SupportTicketThreadTitle")}</h3>

          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">{t("SupportTicketNoMessages")}</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`rounded-lg p-4 border ${
                    message.isInternalNote
                      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                      : message.authorType === "agent"
                        ? "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900"
                        : "bg-gray-50 border-gray-100 dark:bg-gray-700 dark:border-gray-600"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {message.authorName || message.authorEmail || (message.authorType === "agent" ? t("SupportTicketCreatedByMerchant") : t("SupportTicketCreatedByCustomer"))}
                      </span>
                      {message.isInternalNote && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                          {t("SupportTicketInternalNoteBadge")}
                        </span>
                      )}
                      {message.isSolution && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 flex items-center">
                          <FiCheckCircle className="mr-1" size={12} />
                          {t("SupportTicketSolutionBadge")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(message.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {canReply && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form onSubmit={handleSend}>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="4"
                placeholder={t("SupportTicketReplyPlaceholder")}
                className="mb-3"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    variant={!isInternalNote ? "primary" : "secondary"}
                    size="sm"
                  >
                    {t("SupportTicketReplyPublic")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    variant={isInternalNote ? "warning" : "secondary"}
                    size="sm"
                  >
                    {t("SupportTicketReplyInternalNote")}
                  </Button>


                  {!isInternalNote && (
                    <label className="flex items-center text-sm text-gray-600 dark:text-gray-300 ml-2">
                      <input
                        type="checkbox"
                        checked={isSolution}
                        onChange={(e) => setIsSolution(e.target.checked)}
                        className="mr-2"
                      />
                      {t("SupportTicketMarkAsSolution")}
                    </label>
                  )}
                </div>

                <Button type="submit" disabled={!content.trim() || isSubmitting} className="h-10">
                  {t("SupportTicketSendReply")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default SupportTicketDetail;
