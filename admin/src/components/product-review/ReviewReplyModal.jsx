import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter, Textarea } from "@windmill/react-ui";
import { FiCornerUpLeft, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@sofia/ui";

//internal import

const Stars = ({ rating }) => (
  <span className="text-amber-500 tracking-tighter" title={`${rating}/5`}>
    {"â˜…".repeat(rating)}
    <span className="text-gray-300 dark:text-gray-600">{"â˜…".repeat(5 - rating)}</span>
  </span>
);

// Reply-to-review modal: shows the customer's review for context and lets the
// admin write (or edit/delete) the single public store reply.
const ReviewReplyModal = ({ isOpen, onClose, review, isSubmitting, onSubmit, onDeleteReply }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(review?.reply?.message || "");
  }, [review]);

  if (!review) return null;

  const hasExistingReply = !!review?.reply?.message;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="custom-modal px-8 pt-6 pb-4">
        <span className="flex justify-center text-3xl mb-4 text-emerald-500">
          <FiCornerUpLeft />
        </span>
        <h2 className="text-xl font-medium mb-4 text-center">
          {hasExistingReply ? t("ReviewsEditReplyTitle") : t("ReviewsReplyTitle")}
        </h2>

        <div className="mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-700 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{review.reviewerName}</span>
            <Stars rating={review.rating} />
          </div>
          {review.title && <div className="text-sm font-medium mt-1">{review.title}</div>}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{review.comment}</p>
        </div>

        <Textarea
          rows="4"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("ReviewsReplyPlaceholder")}
        />
      </ModalBody>

      <ModalFooter className="justify-center">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={onClose}
        >
          {t("CancelBtn")}
        </Button>

        {hasExistingReply && (
          <Button
            className="w-full sm:w-auto bg-red-500 btn-red"
            disabled={isSubmitting}
            onClick={onDeleteReply}
          >
            <span className="mr-2">
              <FiTrash2 />
            </span>
            {t("ReviewsDeleteReply")}
          </Button>
        )}

        {isSubmitting ? (
          <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
            <LoadingSpinner alt="Loading" width={20} height={10} />
            <span className="font-serif ml-2 font-light">{t("Processing")}</span>
          </Button>
        ) : (
          <Button
            onClick={() => onSubmit(message)}
            disabled={!message.trim()}
            className="w-full h-12 sm:w-auto"
          >
            {t("ReviewsSendReply")}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ReviewReplyModal;
