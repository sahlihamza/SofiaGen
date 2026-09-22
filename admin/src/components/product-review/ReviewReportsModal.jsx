import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter, Badge } from "@windmill/react-ui";
import { FiFlag } from "react-icons/fi";
import { useTranslation } from "react-i18next";

//internal import
import ProductReviewServices from "@/services/ProductReviewServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError } from "@/utils/toast";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

const REASON_BADGE = {
  spam: "neutral",
  offensive: "danger",
  fake: "warning",
  inappropriate: "danger",
  other: "neutral",
};

// Moderation modal: lists every visitor report on a review (reason, optional
// comment, date) and lets the admin dismiss them all ("nothing wrong here").
const ReviewReportsModal = ({ isOpen, onClose, review, isSubmitting, onClearReports }) => {
  const { t } = useTranslation();
  const { showDateFormat } = useUtilsFunction();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !review) return;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductReviewServices.getReviewReports(review._id);
        setReports(res.data || []);
      } catch (err) {
        notifyError(err?.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, review]);

  if (!review) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-4 text-red-500">
          <FiFlag />
        </span>
        <h2 className="text-xl font-medium mb-1 text-center">{t("ReviewsReportsTitle")}</h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          {review.reviewerName} â€” {review.title || review.comment}
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner alt="Loading" width={30} height={15} />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{t("ReviewsNoReports")}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {reports.map((report) => (
              <li key={report._id} className="py-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge type={REASON_BADGE[report.reason] || "neutral"}>
                    {t(`ReviewsReportReason_${report.reason}`)}
                  </Badge>
                  {report.comment && (
                    <p className="text-xs text-gray-500 mt-1 break-words">{report.comment}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {showDateFormat(report.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("CancelBtn")}
        </Button>

        {reports.length > 0 &&
          (isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
              <LoadingSpinner alt="Loading" width={20} height={10} />
              <span className="font-serif ml-2 font-light">{t("Processing")}</span>
            </Button>
          ) : (
            <Button onClick={onClearReports} className="w-full h-12 sm:w-auto">
              {t("ReviewsDismissReports")}
            </Button>
          ))}
      </ModalFooter>
    </Modal>
  );
};

export default ReviewReportsModal;
