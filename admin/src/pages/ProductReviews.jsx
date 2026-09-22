import { Card, CardBody, Input, Pagination, Select, Table, TableCell, TableContainer, TableFooter, TableHeader } from "@windmill/react-ui";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiTrash2 } from "react-icons/fi";

//internal import
import AnimatedContent from "@/components/common/AnimatedContent";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import CheckBox from "@/components/form/others/CheckBox";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import ProductReviewTable from "@/components/product-review/ProductReviewTable";
import ReviewReplyModal from "@/components/product-review/ReviewReplyModal";
import ReviewReportsModal from "@/components/product-review/ReviewReportsModal";
import ReviewSettingsCard from "@/components/product-review/ReviewSettingsCard";
import ProductReviewServices from "@/services/ProductReviewServices";
import useGetCData from "@/hooks/useGetCData";
import { StoreContext, useStoreContext } from "@/context/StoreContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const RESULTS_PER_PAGE = 20;

const ProductReviews = () => {
  const { t } = useTranslation();
  const { hasPermission } = useGetCData();
  const canDelete = hasPermission("reviews", "delete");
  const canApprove = hasPermission("reviews", "approve");
  const canReply = hasPermission("reviews", "reply");
  const { currentStoreId } = useStoreContext();

  const searchRef = useRef("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);

  const [reviews, setReviews] = useState([]);
  const [totalDoc, setTotalDoc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const [pendingDelete, setPendingDelete] = useState(null); // { ids } or null
  const [isDeleting, setIsDeleting] = useState(false);

  const [replyTarget, setReplyTarget] = useState(null); // review being replied to, or null
  const [isReplying, setIsReplying] = useState(false);

  const [pendingMediaDelete, setPendingMediaDelete] = useState(null); // media item or null
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  const [reportsTarget, setReportsTarget] = useState(null); // review whose reports are shown
  const [isClearingReports, setIsClearingReports] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ProductReviewServices.getAllProductReviews({
        search,
        status,
        rating,
        page,
        limit: RESULTS_PER_PAGE,
      });
      setReviews(res.data || []);
      setTotalDoc(res.totalDoc || 0);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, rating, page, currentStoreId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitFilter = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchRef.current.value);
  };

  const handleResetFilter = () => {
    searchRef.current.value = "";
    setSearch("");
    setStatus("");
    setRating("");
    setPage(1);
  };

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(isCheckAll ? [] : reviews.map((r) => r._id));
  };

  const runStatusAction = async (action, id) => {
    try {
      await action(id);
      notifySuccess(t("ReviewsStatusUpdated"));
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const handleApprove = (id) => runStatusAction(ProductReviewServices.approveProductReview, id);
  const handleReject = (id) => runStatusAction(ProductReviewServices.rejectProductReview, id);
  const handleSpam = (id) => runStatusAction(ProductReviewServices.markAsSpamProductReview, id);

  const handleSubmitReply = async (message) => {
    if (!replyTarget) return;
    try {
      setIsReplying(true);
      await ProductReviewServices.replyProductReview(replyTarget._id, message);
      notifySuccess(t("ReviewsReplySuccess"));
      setReplyTarget(null);
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleDeleteReply = async () => {
    if (!replyTarget) return;
    try {
      setIsReplying(true);
      await ProductReviewServices.deleteReviewReply(replyTarget._id);
      notifySuccess(t("ReviewsReplyDeleted"));
      setReplyTarget(null);
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsReplying(false);
    }
  };

  const handleClearReports = async () => {
    if (!reportsTarget) return;
    try {
      setIsClearingReports(true);
      await ProductReviewServices.clearReviewReports(reportsTarget._id);
      notifySuccess(t("ReviewsReportsDismissed"));
      setReportsTarget(null);
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsClearingReports(false);
    }
  };

  const handleConfirmDeleteMedia = async () => {
    if (!pendingMediaDelete) return;
    try {
      setIsDeletingMedia(true);
      await ProductReviewServices.deleteReviewMedia(pendingMediaDelete._id);
      notifySuccess(t("ReviewsMediaDeleted"));
      setPendingMediaDelete(null);
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      if (pendingDelete.ids.length > 1) {
        await ProductReviewServices.deleteManyProductReviews(pendingDelete.ids);
      } else {
        await ProductReviewServices.deleteProductReview(pendingDelete.ids[0]);
      }
      notifySuccess(t("ReviewsDeleteSuccess"));
      setIsCheck([]);
      setIsCheckAll(false);
      setPendingDelete(null);
      fetchReviews();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageTitle>{t("ReviewsPageTitle")}</PageTitle>

      <ReviewSettingsCard />

      <ReviewReplyModal
        isOpen={!!replyTarget}
        onClose={() => setReplyTarget(null)}
        review={replyTarget}
        isSubmitting={isReplying}
        onSubmit={handleSubmitReply}
        onDeleteReply={handleDeleteReply}
      />

      <ReviewReportsModal
        isOpen={!!reportsTarget}
        onClose={() => setReportsTarget(null)}
        review={reportsTarget}
        isSubmitting={isClearingReports}
        onClearReports={handleClearReports}
      />

      <ConfirmActionModal
        isOpen={!!pendingMediaDelete}
        onClose={() => setPendingMediaDelete(null)}
        onConfirm={handleConfirmDeleteMedia}
        isSubmitting={isDeletingMedia}
        title={t("ReviewsMediaDeleteConfirmTitle")}
        message={t("ReviewsMediaDeleteConfirmMessage")}
        confirmLabel={t("Delete")}
      />

      <ConfirmActionModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("ReviewsDeleteConfirmTitle")}
        message={t("ReviewsDeleteConfirmMessage")}
        confirmLabel={t("Delete")}
      />

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSubmitFilter}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex items-center"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input ref={searchRef} type="search" placeholder={t("ReviewsSearchPlaceholder")} />
              </div>

              <div className="w-full md:w-56">
                <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">{t("ReviewsFilterAllStatus")}</option>
                  <option value="pending">{t("ReviewsStatus_pending")}</option>
                  <option value="approved">{t("ReviewsStatus_approved")}</option>
                  <option value="rejected">{t("ReviewsStatus_rejected")}</option>
                  <option value="spam">{t("ReviewsStatus_spam")}</option>
                </Select>
              </div>

              <div className="w-full md:w-56">
                <Select value={rating} onChange={(e) => { setRating(e.target.value); setPage(1); }}>
                  <option value="">{t("ReviewsFilterAllRatings")}</option>
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {"â˜…".repeat(r)} ({r})

                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    Filter
                  </Button>
                </div>
                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleResetFilter}
                    type="reset"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
              </div>
            </form>

            {canDelete && isCheck.length > 0 && (
              <div className="w-full md:w-48">
                <Button
                  onClick={() => setPendingDelete({ ids: isCheck })}
                  className="w-full rounded-md h-12 bg-red-500 btn-red"
                >
                  <span className="mr-2">
                    <FiTrash2 />
                  </span>
                  {t("Delete")} ({isCheck.length})
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={8} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : reviews?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    handleClick={handleSelectAll}
                    isChecked={isCheckAll}
                  />
                </TableCell>
                <TableCell>{t("ReviewsTblCustomer")}</TableCell>
                <TableCell>{t("ReviewsTblProduct")}</TableCell>
                <TableCell>{t("ReviewsTblRating")}</TableCell>
                <TableCell>{t("ReviewsTblReview")}</TableCell>
                <TableCell className="text-center">{t("ReviewsTblVerified")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell>{t("ReviewsTblDate")}</TableCell>
                <TableCell className="text-right">{t("Actions")}</TableCell>
              </tr>
            </TableHeader>
            <ProductReviewTable
              reviews={reviews}
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              onApprove={canApprove ? handleApprove : undefined}
              onReject={canApprove ? handleReject : undefined}
              onSpam={canApprove ? handleSpam : undefined}
              onDelete={canDelete ? (id) => setPendingDelete({ ids: [id] }) : undefined}
              onReply={canReply ? (review) => setReplyTarget(review) : undefined}
              onDeleteMedia={(item) => setPendingMediaDelete(item)}
              onShowReports={(review) => setReportsTarget(review)}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={totalDoc}
              resultsPerPage={RESULTS_PER_PAGE}
              onChange={setPage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("ReviewsNotFound")} />
      )}
    </>
  );
};

export default ProductReviews;
