import { Card, CardBody, Input, Modal, ModalBody, ModalFooter, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiCornerUpLeft, FiShield, FiTrash2 } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import PostCommentServices from "@/services/PostCommentServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-emerald-50 text-emerald-600",
  spam: "bg-orange-50 text-orange-600",
  trash: "bg-red-50 text-red-500",
};

const PostComments = () => {
  const { t } = useTranslation();
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;
  const {
    setIsUpdate,
    currentPage,
    handleChangePage,
    searchText,
    setSearchText,
    searchRef,
    handleSubmitForAll,
    limitData,
  } = useContext(SidebarContext);

  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error } = useAsync(() =>
    PostCommentServices.getAllPostComments({
      page: currentPage,
      limit: limitData,
      search: searchText,
      status: statusFilter,
    })
  );
  const commentList = data?.data || [];

  const handleResetField = () => {
    setStatusFilter("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const [moderatingId, setModeratingId] = useState(null);
  const handleModerate = async (comment, status) => {
    try {
      setModeratingId(comment._id);
      await PostCommentServices.moderatePostComment(comment._id, status);
      notifySuccess(t("PostCommentModerateSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setModeratingId(null);
    }
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (comment) => {
    setPendingDelete(comment);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      await PostCommentServices.deletePostComment(pendingDelete._id);
      notifySuccess(t("PostCommentDeleteSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const [replyTarget, setReplyTarget] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const handleReplySubmit = async () => {
    if (!replyContent.trim() || !replyTarget) return;
    try {
      setIsReplying(true);
      await PostCommentServices.addPostComment({
        postId: replyTarget.postId?._id || replyTarget.postId,
        parentId: replyTarget._id,
        authorName: adminInfo?.name || "Admin",
        authorEmail: adminInfo?.email || "admin@sofiagen.dev",
        content: replyContent.trim(),
        status: "approved",
      });
      notifySuccess(t("PostCommentReplySuccess"));
      setReplyTarget(null);
      setReplyContent("");
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsReplying(false);
    }
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "â€”";


  return (
    <>
      <PageTitle>{t("PostCommentsPageTitle")}</PageTitle>

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("PostCommentDeleteConfirmTitle")}
        message={t("PostCommentDeleteConfirmMessage")}
        confirmLabel={t("modalDeletBtn")}
      />

      <Modal isOpen={!!replyTarget} onClose={() => setReplyTarget(null)}>
        <ModalBody className="px-8 pt-6 pb-4">
          <h2 className="text-lg font-medium mb-4">{t("PostCommentReplyTitle")}</h2>
          <p className="text-sm text-gray-500 mb-3">{replyTarget?.content}</p>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
            placeholder={t("PostCommentReplyPlaceholder")}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-md p-3 dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button layout="outline" onClick={() => setReplyTarget(null)}>
            {t("CancelBtn")}
          </Button>
          <Button onClick={handleReplySubmit} disabled={isReplying || !replyContent.trim()}>
            {t("PostCommentReplySubmit")}
          </Button>
        </ModalFooter>
      </Modal>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSubmitForAll}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input ref={searchRef} type="search" name="search" placeholder={t("SearchPostCommentsPlaceholder")} />
              </div>
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t("PostAllStatus")}</option>
                  <option value="pending">{t("PostCommentStatusPending")}</option>
                  <option value="approved">{t("PostCommentStatusApproved")}</option>
                  <option value="spam">{t("PostCommentStatusSpam")}</option>
                  <option value="trash">{t("PostCommentStatusTrash")}</option>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("FilterBtn")}
                  </Button>
                </div>
                <div className="w-full">
                  <Button
                    layout="outline"
                    onClick={handleResetField}
                    type="reset"
                    className="px-4 md:py-1 py-3 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">{t("ResetBtn")}</span>
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        {loading ? (
          <TableLoading row={12} col={6} width={180} height={20} />
        ) : error ? (
          <span className="text-center mx-auto text-red-500">{error}</span>
        ) : (
          <TableContainer className="mb-8">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("PostCommentAuthorTbl")}</TableCell>
                  <TableCell>{t("PostCommentContentTbl")}</TableCell>
                  <TableCell>{t("PostCommentPostTbl")}</TableCell>
                  <TableCell className="text-center">{t("StatusTbl")}</TableCell>
                  <TableCell>{t("Created")}</TableCell>
                  <TableCell className="text-center">{t("Actions")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {commentList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <span className="block text-center text-sm text-gray-400 py-6">
                        {t("NoPostCommentsRightNow")}
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {commentList.map((comment) => (
                  <TableRow key={comment._id}>
                    <TableCell>
                      <span className="text-sm font-medium block">{comment.authorName}</span>
                      <span className="text-xs text-gray-400">{comment.authorEmail}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm block max-w-[220px] truncate" title={comment.content}>
                        {comment.content}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500 max-w-[140px] truncate block">
                        {comment.postId?.title || "â€”"}

                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[comment.status]}`}>
                        {t(`PostCommentStatus${comment.status.charAt(0).toUpperCase()}${comment.status.slice(1)}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(comment.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center items-center gap-3">
                        {comment.status !== "approved" && (
                          <Button
                            type="button"
                            disabled={moderatingId === comment._id}
                            onClick={() => handleModerate(comment, "approved")}
                            className="text-gray-400 hover:text-emerald-600"
                            title={t("PostCommentApprove")}
                          >
                            <FiCheck size={16} />
                          </Button>
                        )}
                        {comment.status !== "spam" && (
                          <Button
                            type="button"
                            disabled={moderatingId === comment._id}
                            onClick={() => handleModerate(comment, "spam")}
                            className="text-gray-400 hover:text-orange-600"
                            title={t("PostCommentMarkSpam")}
                          >
                            <FiShield size={16} />
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => {
                            setReplyTarget(comment);
                            setReplyContent("");
                          }}
                          className="text-gray-400 hover:text-blue-600"
                          title={t("PostCommentReplyTitle")}
                        >
                          <FiCornerUpLeft size={16} />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDeleteClick(comment)}
                          className="text-gray-400 hover:text-red-600"
                          title={t("Delete")}
                        >
                          <FiTrash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TableFooter>
              <Pagination
                totalResults={data?.totalDoc || 0}
                resultsPerPage={limitData}
                onChange={handleChangePage}
                label={t("PostCommentsPageNavigation")}
              />
            </TableFooter>
          </TableContainer>
        )}
      </AnimatedContent>
    </>
  );
};

export default PostComments;
