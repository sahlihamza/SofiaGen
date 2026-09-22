import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory } from "react-router-dom";
import { FiCopy, FiEdit, FiPlus, FiStar, FiTrash2 } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import PostServices from "@/services/PostServices";
import PostCategoryServices from "@/services/PostCategoryServices";
import PostTagServices from "@/services/PostTagServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-600",
  published: "bg-emerald-50 text-emerald-600",
  private: "bg-purple-50 text-purple-600",
  archived: "bg-red-50 text-red-500",
};

const Posts = () => {
  const { t } = useTranslation();
  const history = useHistory();
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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const { data, loading, error } = useAsync(() =>
    PostServices.getAllPosts({
      page: currentPage,
      limit: limitData,
      search: searchText,
      status: statusFilter,
      category: categoryFilter,
      tag: tagFilter,
    })
  );
  const postList = data?.data || [];

  const { data: categoriesData } = useAsync(() => PostCategoryServices.getAllPostCategories({}));
  const categoryOptions = categoriesData?.data || [];
  const { data: tagsData } = useAsync(() => PostTagServices.getAllPostTags({}));
  const tagOptions = tagsData?.data || [];

  const handleResetField = () => {
    setStatusFilter("");
    setCategoryFilter("");
    setTagFilter("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const [checkedIds, setCheckedIds] = useState([]);
  const toggleCheck = (id) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };
  const toggleCheckAll = () => {
    setCheckedIds((prev) => (prev.length === postList.length ? [] : postList.map((p) => p._id)));
  };

  const [bulkAction, setBulkAction] = useState("");
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkTagId, setBulkTagId] = useState("");

  const runBulkAction = async () => {
    try {
      setIsBulkSubmitting(true);
      if (bulkAction === "publish") await PostServices.bulkUpdateStatus(checkedIds, "published");
      if (bulkAction === "unpublish") await PostServices.bulkUpdateStatus(checkedIds, "draft");
      if (bulkAction === "archive") await PostServices.bulkUpdateStatus(checkedIds, "archived");
      if (bulkAction === "delete") await PostServices.deleteManyPosts(checkedIds);
      if (bulkAction === "category" && bulkCategoryId) {
        await PostServices.bulkChangeCategory(checkedIds, bulkCategoryId);
      }
      if (bulkAction === "tag" && bulkTagId) {
        await PostServices.bulkAddTag(checkedIds, bulkTagId);
      }
      notifySuccess(t("PostBulkActionSuccess"));
      setCheckedIds([]);
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsBulkSubmitting(false);
      setIsBulkConfirmOpen(false);
      setBulkAction("");
    }
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (post) => {
    setPendingDelete(post);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      await PostServices.deletePost(pendingDelete._id);
      notifySuccess(t("PostDeleteSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const handleDuplicate = async (post) => {
    try {
      await PostServices.duplicatePost(post._id);
      notifySuccess(t("PostDuplicateSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "â€”";


  return (
    <>
      <PageTitle>{t("PostsPageTitle")}</PageTitle>

      <ConfirmActionModal
        isOpen={isBulkConfirmOpen}
        onClose={() => setIsBulkConfirmOpen(false)}
        onConfirm={runBulkAction}
        isSubmitting={isBulkSubmitting}
        title={t("PostBulkActionConfirmTitle")}
        message={t("PostBulkActionConfirmMessage", { count: checkedIds.length })}
        confirmLabel={t("ApplyBtn")}
      />

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("PostDeleteConfirmTitle")}
        message={t("PostDeleteConfirmMessage")}
        confirmLabel={t("modalDeletBtn")}
      />

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSubmitForAll}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex flex-wrap items-center"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input ref={searchRef} type="search" name="search" placeholder={t("SearchPostsPlaceholder")} />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">{t("PostAllStatus")}</option>
                  <option value="draft">{t("PostStatusDraft")}</option>
                  <option value="pending">{t("PostStatusPending")}</option>
                  <option value="published">{t("PostStatusPublished")}</option>
                  <option value="private">{t("PostStatusPrivate")}</option>
                  <option value="archived">{t("PostStatusArchived")}</option>
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="">{t("PostAllCategories")}</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                  <option value="">{t("PostAllTags")}</option>
                  {tagOptions.map((tag) => (
                    <option key={tag._id} value={tag._id}>
                      {tag.name}
                    </option>
                  ))}
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

              <div className="w-full md:w-56 lg:w-56 xl:w-56">
                <Button
                  type="button"
                  onClick={() => history.push("/posts/add")}
                  className="w-full rounded-md h-12"
                >
                  <span className="mr-3">
                    <FiPlus />
                  </span>
                  {t("AddNewPost")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {checkedIds.length > 0 && (
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-500">
                {t("PostSelectedCount", { count: checkedIds.length })}
              </span>
              <Select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="w-auto"
              >
                <option value="">{t("PostBulkActionSelect")}</option>
                <option value="publish">{t("PostBulkPublish")}</option>
                <option value="unpublish">{t("PostBulkUnpublish")}</option>
                <option value="archive">{t("PostBulkArchive")}</option>
                <option value="category">{t("PostBulkChangeCategory")}</option>
                <option value="tag">{t("PostBulkAddTag")}</option>
                <option value="delete">{t("PostBulkDelete")}</option>
              </Select>

              {bulkAction === "category" && (
                <Select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="w-auto"
                >
                  <option value="">{t("PostCategoryParentLabel")}</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              )}

              {bulkAction === "tag" && (
                <Select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)} className="w-auto">
                  <option value="">{t("PostTagsPageTitle")}</option>
                  {tagOptions.map((tag) => (
                    <option key={tag._id} value={tag._id}>
                      {tag.name}
                    </option>
                  ))}
                </Select>
              )}

              <Button
                type="button"
                disabled={
                  !bulkAction ||
                  (bulkAction === "category" && !bulkCategoryId) ||
                  (bulkAction === "tag" && !bulkTagId)
                }
                onClick={() => setIsBulkConfirmOpen(true)}
                className="h-10"
              >
                {t("ApplyBtn")}
              </Button>
            </CardBody>
          </Card>
        )}

        {loading ? (
          <TableLoading row={12} col={7} width={163} height={20} />
        ) : error ? (
          <span className="text-center mx-auto text-red-500">{error}</span>
        ) : (
          <TableContainer className="mb-8 rounded-b-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={postList.length > 0 && checkedIds.length === postList.length}
                      onChange={toggleCheckAll}
                    />
                  </TableCell>
                  <TableCell>{t("PostTitleTbl")}</TableCell>
                  <TableCell>{t("PostAuthorTbl")}</TableCell>
                  <TableCell>{t("PostCategoriesPageTitle")}</TableCell>
                  <TableCell className="text-center">{t("StatusTbl")}</TableCell>
                  <TableCell>{t("Created")}</TableCell>
                  <TableCell className="text-center">{t("Actions")}</TableCell>
                </tr>
              </TableHeader>
              <TableBody>
                {postList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <span className="block text-center text-sm text-gray-400 py-6">
                        {t("NoPostsRightNow")}
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {postList.map((post) => (
                  <TableRow key={post._id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(post._id)}
                        onChange={() => toggleCheck(post._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/posts/${post._id}/edit`}
                        className="flex items-center gap-1.5 font-medium text-sm hover:text-emerald-600 max-w-[220px] truncate"
                        title={post.title}
                      >
                        {post.sticky && <FiStar className="text-amber-400 fill-current flex-shrink-0" size={13} />}
                        <span className="truncate">{post.title}</span>
                      </Link>
                      <p className="text-xs text-gray-400 truncate max-w-[220px]">/{post.slug}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{post.authorId?.name || "â€”"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate max-w-[140px] block">
                        {(post.categories || []).map((c) => c.name).join(", ") || "â€”"}

                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_STYLES[post.status] || STATUS_STYLES.draft
                        }`}
                      >
                        {t(`PostStatus${post.status.charAt(0).toUpperCase()}${post.status.slice(1)}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(post.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center items-center gap-3">
                        <Link
                          to={`/posts/${post._id}/edit`}
                          className="text-gray-400 hover:text-emerald-600"
                          title={t("Edit")}
                        >
                          <FiEdit size={16} />
                        </Link>
                        <Button
                          type="button"
                          onClick={() => handleDuplicate(post)}
                          className="text-gray-400 hover:text-blue-600"
                          title={t("PostDuplicate")}
                        >
                          <FiCopy size={16} />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDeleteClick(post)}
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
                label={t("PostsPageNavigation")}
              />
            </TableFooter>
          </TableContainer>
        )}
      </AnimatedContent>
    </>
  );
};

export default Posts;
