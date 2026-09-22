import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiFolder, FiPlus } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import Error from "@/components/form/others/Error";
import TagActionsMenu from "@/components/tag/TagActionsMenu";
import Uploader from "@/components/image-uploader/Uploader";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import PostCategoryServices from "@/services/PostCategoryServices";
import { getImageUrl } from "@/utils/getImageUrl";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const PostCategories = () => {
  const { t } = useTranslation();
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

  const { data, loading, error } = useAsync(() =>
    PostCategoryServices.getAllPostCategories({
      page: currentPage,
      limit: limitData,
      search: searchText,
    })
  );
  const categoryList = data?.data || [];

  const handleResetField = () => {
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [image, setImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setParentId("");
    setImage("");
    setFormErrors({});
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
  };

  const submitCategory = async () => {
    try {
      setSubmitting(true);
      const body = {
        name: name.trim(),
        description: description.trim(),
        parentId: parentId || null,
        image,
      };
      if (editId) {
        await PostCategoryServices.updatePostCategory(editId, body);
        notifySuccess(t("PostCategoryUpdateSuccess"));
      } else {
        await PostCategoryServices.addPostCategory(body);
        notifySuccess(t("PostCategoryAddSuccess"));
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
    if (!name.trim()) nextErrors.name = { message: t("PostCategoryNameRequired") };
    if (editId && parentId === editId) nextErrors.parentId = { message: t("PostCategoryParentSelfError") };
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editId) {
      setIsUpdateConfirmOpen(true);
    } else {
      submitCategory();
    }
  };

  const handleEdit = (category) => {
    setEditId(category._id);
    setName(category.name || "");
    setDescription(category.description || "");
    setParentId(category.parentId || "");
    setImage(getImageUrl(category.image) || "");
    setFormErrors({});
  };

  const handleDeleteClick = (category) => {
    setPendingDelete(category);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setIsDeleting(true);
      await PostCategoryServices.deletePostCategory(pendingDelete._id);
      notifySuccess(t("PostCategoryDeleteSuccess"));
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

  const parentOptions = categoryList.filter((c) => c._id !== editId);

  return (
    <>
      <PageTitle>{t("PostCategoriesPageTitle")}</PageTitle>

      <ConfirmActionModal
        isOpen={isUpdateConfirmOpen}
        onClose={() => setIsUpdateConfirmOpen(false)}
        onConfirm={submitCategory}
        isSubmitting={submitting}
        title={t("PostCategoryUpdateConfirmTitle")}
        message={t("PostCategoryUpdateConfirmMessage")}
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
        title={t("PostCategoryDeleteConfirmTitle")}
        message={t("PostCategoryDeleteConfirmMessage")}
        confirmLabel={t("modalDeletBtn")}
      />

      <AnimatedContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 lg:col-span-2">
            <CardBody>
              <h4 className="font-medium text-base text-gray-800 dark:text-gray-300 mb-4">
                {editId ? t("UpdatePostCategory") : t("AddPostCategory")}
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
                    placeholder={t("PostCategoryNamePlaceholder")}
                  />
                  <Error errorName={formErrors.name} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("PostCategoryParentLabel")}
                  </label>
                  <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="">{t("PostCategoryNoParent")}</option>
                    {parentOptions.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                  <Error errorName={formErrors.parentId} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("Description")}
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    type="text"
                    placeholder={t("PostCategoryDescriptionPlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("PostCategoryImageLabel")}
                  </label>
                  <Uploader imageUrl={image} setImageUrl={setImage} folder="post" targetWidth={400} targetHeight={300} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit" disabled={submitting} className="h-12 w-full">
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {editId ? t("UpdatePostCategory") : t("AddPostCategory")}
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
                      placeholder={t("SearchPostCategoriesPlaceholder")}
                    />
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
              <TableLoading row={12} col={5} width={180} height={20} />
            ) : error ? (
              <span className="text-center mx-auto text-red-500">{error}</span>
            ) : (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("PostCategoryParentLabel")}</TableCell>
                      <TableCell className="text-center">{t("PostCategoryPostCount")}</TableCell>
                      <TableCell className="text-center">{t("Actions")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {categoryList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <span className="block text-center text-sm text-gray-400 py-6">
                            {t("NoPostCategoriesRightNow")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {categoryList.map((category) => {
                      const parent = categoryList.find((c) => c._id === category.parentId);
                      return (
                        <TableRow key={category._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {category.image ? (
                                <img
                                  src={getImageUrl(category.image)}
                                  alt={category.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <span className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                                  <FiFolder size={14} />
                                </span>
                              )}
                              <span className="font-semibold truncate max-w-[140px]" title={category.name}>
                                {category.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-500">{parent?.name || "â€”"}</span>

                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">{category.postCount || 0}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center items-center">
                              <TagActionsMenu
                                isSubmitting={submitting || isDeleting}
                                onEdit={() => handleEdit(category)}
                                onDelete={() => handleDeleteClick(category)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <TableFooter>
                  <Pagination
                    totalResults={data?.totalDoc || 0}
                    resultsPerPage={limitData}
                    onChange={handleChangePage}
                    label={t("PostCategoriesPageNavigation")}
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

export default PostCategories;
