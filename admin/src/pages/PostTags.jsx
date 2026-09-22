import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import Error from "@/components/form/others/Error";
import TagActionsMenu from "@/components/tag/TagActionsMenu";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import PostTagServices from "@/services/PostTagServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const DEFAULT_COLOR = "#10B981";

const PostTags = () => {
  const { t } = useTranslation();
  const {
    setIsUpdate,
    currentPage,
    handleChangePage,
    searchText,
    setSearchText,
    searchRef,
    handleSubmitForAll,
    sortedField,
    setSortedField,
    limitData,
  } = useContext(SidebarContext);

  const { data, loading, error } = useAsync(() =>
    PostTagServices.getAllPostTags({
      page: currentPage,
      limit: limitData,
      search: searchText,
      sort: sortedField,
    })
  );
  const tagList = data?.data || [];

  const handleResetField = () => {
    setSortedField("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setColor(DEFAULT_COLOR);
    setFormErrors({});
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
  };

  const submitTag = async () => {
    try {
      setSubmitting(true);
      const body = { name: name.trim(), color };
      if (editId) {
        await PostTagServices.updatePostTag(editId, body);
        notifySuccess(t("PostTagUpdateSuccess"));
      } else {
        await PostTagServices.addPostTag(body);
        notifySuccess(t("PostTagAddSuccess"));
      }
      resetForm();
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setSubmitting(false);
      setIsUpdateConfirmOpen(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = { message: t("PostTagNameRequired") };
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editId) {
      setIsUpdateConfirmOpen(true);
    } else {
      submitTag();
    }
  };

  const handleEdit = (tag) => {
    setEditId(tag._id);
    setName(tag.name || "");
    setColor(tag.color || DEFAULT_COLOR);
    setFormErrors({});
  };

  const handleDeleteClick = (tag) => {
    setPendingDelete(tag);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      await PostTagServices.deletePostTag(pendingDelete._id);
      notifySuccess(t("PostTagDeleteSuccess"));
      if (editId === pendingDelete._id) resetForm();
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageTitle>{t("PostTagsPageTitle")}</PageTitle>

      <ConfirmActionModal
        isOpen={isUpdateConfirmOpen}
        onClose={() => setIsUpdateConfirmOpen(false)}
        onConfirm={submitTag}
        isSubmitting={submitting}
        title={t("PostTagUpdateConfirmTitle")}
        message={t("PostTagUpdateConfirmMessage")}
        confirmLabel={t("UpdateBtn")}
      />

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("PostTagDeleteConfirmTitle")}
        message={t("PostTagDeleteConfirmMessage")}
        confirmLabel={t("modalDeletBtn")}
      />

      <AnimatedContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 lg:col-span-2">
            <CardBody>
              <h4 className="font-medium text-base text-gray-800 dark:text-gray-300 mb-4">
                {editId ? t("UpdatePostTag") : t("AddPostTag")}
              </h4>
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("Name")} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={handleNameChange}
                    type="text"
                    placeholder={t("PostTagNamePlaceholder")}
                  />
                  <Error errorName={formErrors.name} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("PostTagColorLabel")}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-14 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
                    />
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {name || t("PostTagNamePlaceholder")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" disabled={submitting} className="h-12 w-full">
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {editId ? t("UpdatePostTag") : t("AddPostTag")}
                  </Button>
                  {editId && (
                    <Button
                      layout="outline"
                      type="button"
                      onClick={resetForm}
                      className="h-12 px-4 dark:bg-gray-700"
                    >
                      <span className="text-black dark:text-gray-200">{t("CancelBtn")}</span>
                    </Button>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          <div className="lg:col-span-3">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
              <CardBody>
                <form
                  onSubmit={handleSubmitForAll}
                  className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
                >
                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Input
                      ref={searchRef}
                      type="search"
                      name="search"
                      placeholder={t("SearchPostTagsPlaceholder")}
                    />
                  </div>

                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Select value={sortedField} onChange={(e) => setSortedField(e.target.value)}>
                      <option value="">{t("SortBy")}</option>
                      <option value="name_asc">{t("SortNameAsc")}</option>
                      <option value="name_desc">{t("SortNameDesc")}</option>
                      <option value="date_desc">{t("SortNewestFirst")}</option>
                      <option value="date_asc">{t("SortOldestFirst")}</option>
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
              <TableLoading row={12} col={4} width={180} height={20} />
            ) : error ? (
              <span className="text-center mx-auto text-red-500">{error}</span>
            ) : (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("TagSlugLabel")}</TableCell>
                      <TableCell className="text-center">{t("PostCategoryPostCount")}</TableCell>
                      <TableCell className="text-center">{t("Actions")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {tagList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <span className="block text-center text-sm text-gray-400 py-6">
                            {t("NoPostTagsRightNow")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {tagList.map((tag) => (
                      <TableRow key={tag._id}>
                        <TableCell>
                          <span
                            className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold truncate max-w-[160px]"
                            style={{ backgroundColor: `${tag.color || DEFAULT_COLOR}20`, color: tag.color || DEFAULT_COLOR }}
                            title={tag.name}
                          >
                            {tag.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block text-sm truncate max-w-[160px]" title={tag.slug}>
                            {tag.slug}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">{tag.postCount || 0}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center">
                            <TagActionsMenu
                              isSubmitting={submitting || isDeleting}
                              onEdit={() => handleEdit(tag)}
                              onDelete={() => handleDeleteClick(tag)}
                            />
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
                    label={t("PostTagsPageNavigation")}
                  />
                </TableFooter>
              </TableContainer>
            )}
          </div>
        </div>
      </AnimatedContent>
    </>
  );
};

export default PostTags;
