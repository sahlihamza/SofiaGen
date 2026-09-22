import { Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiCornerUpLeft, FiFlag, FiThumbsDown, FiThumbsUp, FiVideo, FiX } from "react-icons/fi";

//internal import
import CheckBox from "@/components/form/others/CheckBox";
import ReviewActionsMenu from "@/components/product-review/ReviewActionsMenu";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useGetCData from "@/hooks/useGetCData";
import { getImageUrl } from "@/utils/getImageUrl";
import { Button } from "@sofia/ui";

const STATUS_BADGE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  spam: "neutral",
};

const Stars = ({ rating }) => (
  <span className="text-amber-500 tracking-tighter" title={`${rating}/5`}>
    {"â˜…".repeat(rating)}
    <span className="text-gray-300 dark:text-gray-600">{"â˜…".repeat(5 - rating)}</span>
  </span>
);

const ProductReviewTable = ({
  reviews,
  isCheck,
  setIsCheck,
  onApprove,
  onReject,
  onSpam,
  onDelete,
  onReply,
  onDeleteMedia,
  onShowReports,
}) => {
  const { t } = useTranslation();
  const { showDateFormat } = useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canApprove = hasPermission("reviews", "approve");
  const canDelete = hasPermission("reviews", "delete");
  const canReply = hasPermission("reviews", "reply");
  const canUpdate = hasPermission("reviews", "update");

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <TableBody>
      {reviews?.map((review) => (
        <TableRow key={review._id}>
          <TableCell>
            <CheckBox
              type="checkbox"
              name={review.reviewerName}
              id={review._id}
              handleClick={handleClick}
              isChecked={isCheck?.includes(review._id)}
            />
          </TableCell>

          <TableCell>
            <span className="text-sm font-medium">{review.reviewerName}</span>
            <br />
            <span className="text-xs text-gray-500">{review.reviewerEmail}</span>
          </TableCell>

          <TableCell>
            <span className="text-sm">{review.productId?.productName || "â€”"}</span>
          </TableCell>

          <TableCell>
            <Stars rating={review.rating} />
          </TableCell>

          <TableCell>
            {review.title && <div className="text-sm font-medium">{review.title}</div>}
            <div className="text-sm text-gray-500 truncate max-w-xs" title={review.comment}>
              {review.comment}
            </div>
            {review.media?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {review.media.map((item) => (
                  <span key={item._id} className="relative inline-block group">
                    <a
                      href={getImageUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      title={item.type === "video" ? t("ReviewsMediaVideo") : t("ReviewsMediaImage")}
                    >
                      {item.type === "video" ? (
                        <span className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                          <FiVideo size={14} />
                        </span>
                      ) : (
                        <img
                          src={getImageUrl(item.url)}
                          alt=""
                          className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 object-cover"
                        />
                      )}
                    </a>
                    {canUpdate && onDeleteMedia && (
                      <Button
                        type="button"
                        onClick={() => onDeleteMedia(item)}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white"
                        title={t("Delete")}
                      >
                        <FiX size={10} />
                      </Button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {review.reply?.message && (
              <div
                className="mt-1 pl-2 border-l-2 border-emerald-400 text-xs text-emerald-700 dark:text-emerald-400 truncate max-w-xs"
                title={review.reply.message}
              >
                <FiCornerUpLeft className="inline mr-1" size={11} />
                {review.reply.message}
              </div>
            )}
            {(review.helpfulCount > 0 || review.notHelpfulCount > 0 || review.reportCount > 0) && (
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {(review.helpfulCount > 0 || review.notHelpfulCount > 0) && (
                  <>
                    <span className="flex items-center gap-1" title={t("ReviewsVotesTooltip")}>
                      <FiThumbsUp size={11} className="text-emerald-600" />
                      {review.helpfulCount || 0}
                    </span>
                    <span className="flex items-center gap-1" title={t("ReviewsVotesTooltip")}>
                      <FiThumbsDown size={11} className="text-red-500" />
                      {review.notHelpfulCount || 0}
                    </span>
                  </>
                )}
                {review.reportCount > 0 && (
                  <Button
                    type="button"
                    onClick={() => onShowReports && onShowReports(review)}
                    className="flex items-center gap-1 text-red-600 hover:underline focus:outline-none"
                    title={t("ReviewsReportsTooltip")}
                  >
                    <FiFlag size={11} />
                    {review.reportCount}
                  </Button>
                )}
              </div>
            )}
          </TableCell>

          <TableCell className="text-center">
            {review.verifiedPurchase ? (
              <Badge type="success">{t("ReviewsVerified")}</Badge>
            ) : (
              <span className="text-gray-400 text-sm">â€”</span>
            )}
          </TableCell>

          <TableCell>
            <Badge type={STATUS_BADGE[review.status] || "neutral"}>
              {t(`ReviewsStatus_${review.status}`)}
            </Badge>
          </TableCell>

          <TableCell>
            <span className="text-sm">{showDateFormat(review.createdAt)}</span>
          </TableCell>

          <TableCell>
            <div className="flex justify-end text-right">
              <ReviewActionsMenu
                review={review}
                disabled={isCheck?.length > 0}
                onReply={canReply ? onReply : undefined}
                onApprove={canApprove ? onApprove : undefined}
                onReject={canApprove ? onReject : undefined}
                onSpam={canApprove ? onSpam : undefined}
                onDelete={canDelete ? onDelete : undefined}
              />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export default ProductReviewTable;
