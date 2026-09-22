import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiLock, FiMessageSquare, FiSend, FiUser } from "react-icons/fi";

//internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import OrderCard, {
import { Button } from "@sofia/ui";
  OrderCardSection,
  fieldClass,
  labelClass,
  primaryButton,
  tableHeadCell,
} from "@/components/order/OrderCard";

// A private note and a note the customer will read are not the same object at
// all, so they never look alike: different icon, different colour, different
// row tint in the history below.
const NOTE_TYPES = {
  private: {
    labelKey: "OrderNoteTypePrivate",
    hintKey: "OrderNoteTypePrivateHint",
    icon: FiLock,
    badge:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
    row: "",
    accent: "border-l-2 border-l-slate-300 dark:border-l-slate-600",
  },
  customer: {
    labelKey: "OrderNoteTypeCustomer",
    hintKey: "OrderNoteTypeCustomerHint",
    icon: FiUser,
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
    row: "bg-[#f0f6fc] dark:bg-blue-500/5",
    accent: "border-l-2 border-l-[#2271b1] dark:border-l-blue-400",
  },
};

const noteMeta = (type) => NOTE_TYPES[type] || NOTE_TYPES.private;

const NoteTypeBadge = ({ type }) => {
  const { t } = useTranslation();
  const meta = noteMeta(type);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none ${meta.badge}`}
    >
      <Icon size={11} />
      {t(meta.labelKey)}
    </span>
  );
};

/**
 * "Notes de commande" â€” the trail of what the back-office decided.
 *
 * Notes are append-only, and the customer's own checkout note (`order.notes`)
 * is shown apart from them: it was written by someone else, at another moment,
 * and cannot be answered here.
 */
const OrderNotesCard = ({ order, canUpdate = true, isSaving = false, onAdd }) => {
  const { t } = useTranslation();
  const { showDateFormat, showTimeFormat } = useUtilsFunction();

  const [type, setType] = useState("private");
  const [note, setNote] = useState("");

  const notes = order?.orderNotes || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onAdd({ note: note.trim(), type });
    if (ok) setNote("");
  };

  return (
    <OrderCard
      icon={<FiMessageSquare size={18} />}
      title={t("OrderNotesCardTitle")}
      description={t("OrderNotesCardDescription")}
    >
      {order?.notes && (
        <div className="border-b border-[#f0f0f1] bg-[#f6f7f7] px-5 py-4 dark:border-gray-700 dark:bg-gray-900/40">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#646970] dark:text-gray-400">
            {t("OrderCustomerNoteTitle")}
          </h3>
          <p className="text-sm text-[#1d2327] dark:text-gray-300">
            {order.notes}
          </p>
        </div>
      )}

      {canUpdate && (
        <form onSubmit={handleSubmit} className="p-5">
          <fieldset disabled={isSaving}>
            <legend className={labelClass}>{t("OrderNoteType")}</legend>
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(NOTE_TYPES).map(([value, meta]) => {
                const Icon = meta.icon;
                const isActive = type === value;

                return (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "border-[#2271b1] bg-[#f0f6fc] text-[#1d2327] dark:border-blue-400 dark:bg-blue-500/10 dark:text-gray-100"
                        : "border-[#dcdcde] text-[#646970] hover:border-[#8c8f94] dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderNoteType"
                      value={value}
                      checked={isActive}
                      onChange={() => setType(value)}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#2271b1]"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon size={13} />
                        {t(meta.labelKey)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#8c8f94] dark:text-gray-500">
                        {t(meta.hintKey)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <label className={labelClass} htmlFor="order-note">
              {t("OrderNotesColNote")}
            </label>
            <textarea
              id="order-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("OrderNotePlaceholder")}
              className={`${fieldClass} h-auto resize-y py-2.5`}
            />

            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving || !note.trim()}
                className={primaryButton}
              >
                <FiSend size={15} />
                {t("OrderNoteAdd")}
              </Button>
            </div>
          </fieldset>
        </form>
      )}

      <OrderCardSection title={t("OrderNotesHistoryTitle")}>
        {notes.length === 0 ? (
          <p className="rounded-md border border-dashed border-[#dcdcde] px-4 py-8 text-center text-sm text-[#8c8f94] dark:border-gray-600 dark:text-gray-500">
            {t("OrderNotesHistoryEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[#dcdcde] dark:border-gray-700">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="border-b border-[#dcdcde] bg-[#f6f7f7] dark:border-gray-700 dark:bg-gray-900/40">
                <tr>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderNotesColNote")}
                  </th>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderNotesColType")}
                  </th>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderNotesColAuthor")}
                  </th>
                  <th scope="col" className={tableHeadCell}>
                    {t("OrderNotesColDate")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f1] dark:divide-gray-700">
                {notes.map((entry) => {
                  const meta = noteMeta(entry.type);

                  return (
                    <tr key={entry._id} className={meta.row}>
                      <td
                        className={`px-4 py-3 align-top text-[#1d2327] dark:text-gray-300 ${meta.accent}`}
                      >
                        <p className="whitespace-pre-line">{entry.note}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <NoteTypeBadge type={entry.type} />
                      </td>
                      <td className="px-4 py-3 align-top text-[#646970] dark:text-gray-400">
                        {entry.createdBy?.name || (
                          <span className="italic">
                            {t("OrderNotesAuthorSystem")}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-[#646970] dark:text-gray-400">
                        {showDateFormat(entry.createdAt)}
                        <span className="ml-1.5 text-xs">
                          {showTimeFormat(entry.createdAt, "HH:mm")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OrderCardSection>
    </OrderCard>
  );
};

export default OrderNotesCard;
