import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus } from "react-icons/fi";

//internal import
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import Error from "@/components/form/others/Error";
import TagActionsMenu from "@/components/tag/TagActionsMenu";
import TagStatusToggle from "@/components/tag/TagStatusToggle";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import ProductTagServices from "@/services/ProductTagServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const ProductTags = () => {
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

  // Local status filter â€” kept off SidebarContext's shared "status" field on

  // purpose: that field is reused by Orders for order-status strings, so
  // relying on it here let stale values from other pages silently filter out
  // every tag (see the same fix applied on the Brands page).
  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error } = useAsync(() =>
    ProductTagServices.getAllProductTags({
      page: currentPage,
      limit: limitData,
      name: searchText,
      status: statusFilter,
      sort: sortedField,
    })
  );

  // getAllProductTags returns { tags, totalDoc, limits, pages }
  const tagList = data?.tags || [];

  const handleResetField = () => {
    setSortedField("");
    setStatusFilter("");
    searchRef.current.value = "";
    setSearchText(null);
    setIsUpdate(true);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setIsUpdate(true);
  };

  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Update confirmation (mirrors the Brands page).
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  // Delete confirmation (replaces window.confirm with a themed modal).
  const [pendingDeleteTag, setPendingDeleteTag] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline validation error for the required Name field, shaped like
  // react-hook-form's field errors ({ message }) for the shared <Error />.
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setFormErrors({});
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
  };

  const submitTag = async () => {
    const tagName = name.trim();
    try {
      setSubmitting(true);
      if (editId) {
        await ProductTagServices.updateProductTag(editId, {
          name: tagName,
          description: description.trim(),
        });
        notifySuccess(t("TagUpdateSuccess"));
      } else {
        // status is omitted on create â€” the backend defaults new tags to active.

        await ProductTagServices.addProductTag({
          name: tagName,
          description: description.trim(),
        });
        notifySuccess(t("TagAddSuccess"));
      }
      resetForm();
      setIsUpdate(true); // triggers useAsync to reload
    } catch (err) {
      if (err?.response?.data?.code === "TAG_NAME_EXISTS") {
        setFormErrors((prev) => ({ ...prev, name: { message: t("TagNameExists") } }));
      } else {
        notifyError(err?.response?.data?.message || err?.message);
      }
    } finally {
      setSubmitting(false);
      setIsUpdateConfirmOpen(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const tagName = name.trim();
    const nextErrors = {};
    if (!tagName) nextErrors.name = { message: t("TagNameRequired") };
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Only edits go through a confirmation step â€” creating a tag is a

    // low-risk, easily-reversible action so it submits immediately.
    if (editId) {
      setIsUpdateConfirmOpen(true);
    } else {
      submitTag();
    }
  };

  const handleEdit = (tag) => {
    setEditId(tag._id);
    setName(tag.name || "");
    setDescription(tag.description || "");
    setFormErrors({});
  };

  // Actif/Inactif toggle, confirmed via modal before the API call fires.
  const [pendingStatusTag, setPendingStatusTag] = useState(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const handleStatusToggleClick = (tag) => {
    setPendingStatusTag(tag);
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusTag) return;
    try {
      setIsStatusChanging(true);
      await ProductTagServices.updateProductTag(pendingStatusTag._id, {
        status: pendingStatusTag.status === "active" ? "inactive" : "active",
      });
      notifySuccess(t("TagStatusChangeSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsStatusChanging(false);
      setIsStatusConfirmOpen(false);
      setPendingStatusTag(null);
    }
  };

  const handleDeleteClick = (tag) => {
    setPendingDeleteTag(tag);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTag) return;
    try {
      setIsDeleting(true);
      await ProductTagServices.deleteProductTag(pendingDeleteTag._id);
      notifySuccess(t("TagDeleteSuccess"));
      if (editId === pendingDeleteTag._id) resetForm();
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDeleteTag(null);
    }
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "â€”";


  return (
    <>
      <PageTitle>{t("ProductTags")}</PageTitle>

      <ConfirmActionModal
        isOpen={isUpdateConfirmOpen}
        onClose={() => setIsUpdateConfirmOpen(false)}
        onConfirm={submitTag}
        isSubmitting={submitting}
        title={t("TagUpdateConfirmTitle")}
        message={t("TagUpdateConfirmMessage")}
        confirmLabel={t("TagUpdateConfirmButton")}
      />

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDeleteTag(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("TagDeleteConfirmTitle")}
        message={t("TagDeleteConfirmMessage")}
        confirmLabel={t("TagDeleteConfirmButton")}
      />

      <ConfirmActionModal
        isOpen={isStatusConfirmOpen}
        onClose={() => {
          setIsStatusConfirmOpen(false);
          setPendingStatusTag(null);
        }}
        onConfirm={handleConfirmStatusChange}
        isSubmitting={isStatusChanging}
        title={t("TagStatusChangeConfirmTitle")}
        message={
          pendingStatusTag && (
            <>
              {t("StatusChangeConfirmMessage")}{" "}
              <span className="text-emerald-600">{pendingStatusTag.name}</span>{" "}
              {t("StatusChangeConfirmTo")}{" "}
              <span
                className={
                  pendingStatusTag.status !== "active"
                    ? "text-emerald-600"
                    : "text-red-500"
                }
              >
                {pendingStatusTag.status !== "active"
                  ? t("StatusActive")
                  : t("StatusInactive")}
              </span>
              ?
            </>
          )
        }
        confirmLabel={t("StatusChangeConfirmSave")}
      />

      <AnimatedContent>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Left: Add / Edit form */}
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 lg:col-span-2">
            <CardBody>
              <h4 className="font-medium text-base text-gray-800 dark:text-gray-300 mb-4">
                {editId ? t("UpdateTag") : t("AddNewTag")}
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
                    placeholder={t("TagNamePlaceholder")}
                  />
                  <Error errorName={formErrors.name} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                    {t("Description")}
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    type="text"
                    placeholder={t("TagDescriptionPlaceholder")}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full"
                  >
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {editId ? t("UpdateTag") : t("AddNewTag")}
                  </Button>
                  {editId && (
                    <Button
                      layout="outline"
                      type="button"
                      onClick={resetForm}
                      className="h-12 px-4 dark:bg-gray-700"
                    >
                      <span className="text-black dark:text-gray-200">
                        {t("CancelBtn")}
                      </span>
                    </Button>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Right: Tags list */}
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
                      placeholder={t("SearchTagsPlaceholder")}
                    />
                    <Button
                      type="submit"
                      className="absolute right-0 top-0 mt-5 mr-1"
                    ></Button>
                  </div>

                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Select
                      value={sortedField}
                      onChange={(e) => setSortedField(e.target.value)}
                    >
                      <option value="">{t("SortBy")}</option>
                      <option value="name_asc">{t("SortNameAsc")}</option>
                      <option value="name_desc">{t("SortNameDesc")}</option>
                      <option value="date_desc">{t("SortNewestFirst")}</option>
                      <option value="date_asc">{t("SortOldestFirst")}</option>
                    </Select>
                  </div>

                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Select
                      value={statusFilter}
                      onChange={(e) => handleStatusFilterChange(e.target.value)}
                    >
                      <option value="">{t("AllStatus")}</option>
                      <option value="active">{t("StatusActive")}</option>
                      <option value="inactive">{t("StatusInactive")}</option>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <div className="w-full mx-1">
                      <Button
                        type="submit"
                        className="h-12 w-full bg-emerald-700"
                      >
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
                        <span className="text-black dark:text-gray-200">
                          {t("ResetBtn")}
                        </span>
                      </Button>
                    </div>
                  </div>
                </form>
              </CardBody>
            </Card>

            {loading ? (
              <TableLoading row={12} col={4} width={180} height={20} />
            ) : error ? (
              <span className="text-center mx-auto text-red-500">
                {error?.response?.data?.message || error?.message || String(error)}
              </span>
            ) : (
              <TableContainer className="mb-8">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("TagSlugLabel")}</TableCell>
                      <TableCell>{t("Description")}</TableCell>
                      <TableCell>{t("Created")}</TableCell>
                      <TableCell className="text-center">{t("Status")}</TableCell>
                      <TableCell className="text-center">{t("Actions")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {tagList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <span className="block text-center text-sm text-gray-400 py-6">
                            {t("NoTagsRightNow")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {tagList.map((tag) => (
                      <TableRow key={tag._id}>
                        <TableCell>
                          <span
                            className="block font-semibold truncate max-w-[160px]"
                            title={tag.name}
                          >
                            {tag.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block text-sm truncate max-w-[160px]"
                            title={tag.slug}
                          >
                            {tag.slug}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block text-sm truncate max-w-[160px]"
                            title={tag.description}
                          >
                            {tag.description || "â€”"}

                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(tag.createdAt)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <TagStatusToggle
                              status={tag.status}
                              onClick={() => handleStatusToggleClick(tag)}
                            />
                          </div>
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
                    label={t("TagsPageNavigation")}
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

export default ProductTags;
