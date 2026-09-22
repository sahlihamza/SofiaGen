import { Card, CardBody, Input, Pagination, Select, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow, Textarea } from "@windmill/react-ui";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import exportFromJSON from "export-from-json";
import { BsFileEarmarkCode, BsFileEarmarkMedical } from "react-icons/bs";
import {
  FiDownload,
  FiPlus,
  FiUpload,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

//internal import
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import AnimatedContent from "@/components/common/AnimatedContent";
import Uploader from "@/components/image-uploader/Uploader";
import ConfirmActionModal from "@/components/modal/ConfirmActionModal";
import DataImportExportToolbar from "@/components/common/DataImportExportToolbar";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import FormField from "@/components/form/FormField";
import StatusToggle from "@/components/common/StatusToggle";
import TableActions from "@/components/tables/TableActions";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import BrandServices from "@/services/BrandServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { Button } from "@sofia/ui";

const Brands = () => {
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

  // Local status filter: the "status" field on SidebarContext is shared
  // app-wide (e.g. Orders uses it for order status strings like "Pending"),
  // so reusing it here caused stale values from other pages to silently
  // filter out every brand.
  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error } = useAsync(() =>
    BrandServices.getAllBrands({
      page: currentPage,
      limit: limitData,
      name: searchText,
      status: statusFilter,
      sort: sortedField,
    })
  );

  // getAllBrands returns { brands, totalDoc, limits, pages }
  const brandList = data?.brands || [];

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
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editStatus, setEditStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Update confirmation (mirrors EditProfile.jsx's confirm-before-save flow).
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  // Delete confirmation (replaces window.confirm with a themed modal).
  const [pendingDeleteBrand, setPendingDeleteBrand] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline validation errors for the required fields (Name, Brand logo),
  // shaped like react-hook-form's field errors ({ message }) so the shared
  // <Error /> component can render them.
  const [formErrors, setFormErrors] = useState({});

  const resetForm = () => {
    setEditId(null);
    setName("");
    setSlug("");
    setDescription("");
    setWebsite("");
    setLogoUrl("");
    setEditStatus(true);
    setFormErrors({});
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleSlugChange = (e) => {
    setSlug(e.target.value);
    if (formErrors.slug) setFormErrors((prev) => ({ ...prev, slug: undefined }));
  };

  const submitBrand = async () => {
    const brandName = name.trim();
    try {
      setSubmitting(true);
      if (editId) {
        await BrandServices.updateBrand(editId, {
          name: brandName,
          slug: slug.trim() || undefined,
          description: description.trim(),
          website: website.trim(),
          logo: logoUrl,
          status: editStatus,
        });
        notifySuccess(t("BrandUpdateSuccess"));
      } else {
        // status is omitted on create â€” the backend defaults new brands to active.

        await BrandServices.addBrand({
          name: brandName,
          slug: slug.trim() || undefined,
          description: description.trim(),
          website: website.trim(),
          logo: logoUrl,
        });
        notifySuccess(t("BrandAddSuccess"));
      }
      resetForm();
      setIsUpdate(true); // triggers useAsync to reload
    } catch (err) {
      const errorCode = err?.response?.data?.code;
      if (errorCode === "BRAND_NAME_EXISTS") {
        setFormErrors((prev) => ({ ...prev, name: { message: t("BrandNameExists") } }));
      } else if (errorCode === "BRAND_SLUG_EXISTS") {
        setFormErrors((prev) => ({ ...prev, slug: { message: t("BrandSlugExists") } }));
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
    const brandName = name.trim();
    const nextErrors = {};
    if (!brandName) nextErrors.name = { message: t("BrandNameRequired") };
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Only edits go through a confirmation step â€” creating a brand is a

    // low-risk, easily-reversible action so it submits immediately.
    if (editId) {
      setIsUpdateConfirmOpen(true);
    } else {
      submitBrand();
    }
  };

  const handleEdit = (brand) => {
    setEditId(brand._id);
    setName(brand.name || "");
    setSlug(brand.slug || "");
    setDescription(brand.description || "");
    setWebsite(brand.website || "");
    setLogoUrl(brand.logo || "");
    setEditStatus(brand.status ?? true);
    setFormErrors({});
  };

  // Actif/Inactif toggle, confirmed via modal before the API call fires.
  const [pendingStatusBrand, setPendingStatusBrand] = useState(null);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  const handleStatusToggleClick = (brand) => {
    setPendingStatusBrand(brand);
    setIsStatusConfirmOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusBrand) return;
    try {
      setIsStatusChanging(true);
      await BrandServices.updateBrand(pendingStatusBrand._id, {
        status: !pendingStatusBrand.status,
      });
      notifySuccess(t("BrandStatusChangeSuccess"));
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsStatusChanging(false);
      setIsStatusConfirmOpen(false);
      setPendingStatusBrand(null);
    }
  };

  const handleDeleteClick = (brand) => {
    setPendingDeleteBrand(brand);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteBrand) return;
    try {
      setIsDeleting(true);
      await BrandServices.deleteBrand(pendingDeleteBrand._id);
      notifySuccess(t("BrandDeleteSuccess"));
      if (editId === pendingDeleteBrand._id) resetForm();
      setIsUpdate(true);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
      setPendingDeleteBrand(null);
    }
  };

  // ---- Export / Import ----
  const exportDropdownRef = useRef();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportBoxShown, setIsImportBoxShown] = useState(false);
  const [selectedFile, setSelectedFile] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!exportDropdownRef?.current?.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAllBrandsForExport = async () => {
    const res = await BrandServices.getAllBrands({
      page: 1,
      limit: data?.totalDoc || 1000,
      name: searchText,
      status: statusFilter,
      sort: sortedField,
    });
    return res?.brands || [];
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const allBrands = await fetchAllBrandsForExport();
      exportFromJSON({
        data: allBrands,
        fileName: "brands",
        exportType: exportFromJSON.types.csv,
      });
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const allBrands = await fetchAllBrandsForExport();
      exportFromJSON({
        data: allBrands,
        fileName: "brands",
        exportType: exportFromJSON.types.json,
      });
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsExporting(false);
      setIsExportOpen(false);
    }
  };

  const handleSelectFile = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      notifyError("Unsupported file type! Please select a JSON file.");
      return;
    }

    setFileName(file.name);
    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const list = Array.isArray(parsed) ? parsed : [];
        setSelectedFile(
          list.map((value) => ({
            name: value.name,
            slug: value.slug,
            description: value.description,
            website: value.website,
            logo: value.logo,
            status: value.status,
          }))
        );
      } catch (err) {
        notifyError("Invalid JSON file!");
        setSelectedFile([]);
      }
    };
  };

  const handleRemoveSelectFile = () => {
    setFileName("");
    setSelectedFile([]);
  };

  const handleImportSubmit = async () => {
    if (!selectedFile.length) {
      return notifyError("Please select a JSON file first!");
    }
    try {
      setIsImporting(true);
      const res = await BrandServices.addAllBrands(selectedFile);
      notifySuccess(res?.message || t("BrandImportSuccess"));
      setIsUpdate(true);
      handleRemoveSelectFile();
      setIsImportBoxShown(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <PageTitle>{t("Brands")}</PageTitle>

      <ConfirmActionModal
        isOpen={isUpdateConfirmOpen}
        onClose={() => setIsUpdateConfirmOpen(false)}
        onConfirm={submitBrand}
        isSubmitting={submitting}
        title={t("BrandUpdateConfirmTitle")}
        message={t("BrandUpdateConfirmMessage")}
        confirmLabel={t("BrandUpdateConfirmButton")}
      />

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setPendingDeleteBrand(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        title={t("BrandDeleteConfirmTitle")}
        message={t("BrandDeleteConfirmMessage")}
        confirmLabel={t("BrandDeleteConfirmButton")}
      />

      <ConfirmActionModal
        isOpen={isStatusConfirmOpen}
        onClose={() => {
          setIsStatusConfirmOpen(false);
          setPendingStatusBrand(null);
        }}
        onConfirm={handleConfirmStatusChange}
        isSubmitting={isStatusChanging}
        title={t("BrandStatusChangeConfirmTitle")}
        message={
          pendingStatusBrand && (
            <>
              {t("StatusChangeConfirmMessage")}{" "}
              <span className="text-emerald-600">{pendingStatusBrand.name}</span>{" "}
              {t("StatusChangeConfirmTo")}{" "}
              <span
                className={
                  !pendingStatusBrand.status ? "text-emerald-600" : "text-red-500"
                }
              >
                {!pendingStatusBrand.status
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
                {editId ? t("UpdateBrand") : t("AddNewBrand")}
              </h4>
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                <FormField label={t("Name")} required error={formErrors.name} helpText={t("BrandNameHelp")}>
                  <Input
                    value={name}
                    onChange={handleNameChange}
                    type="text"
                    placeholder={t("BrandNamePlaceholder")}
                  />
                </FormField>

                <FormField label={t("BrandSlugLabel")} error={formErrors.slug} helpText={t("BrandSlugHelp")}>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    type="text"
                    placeholder={t("BrandSlugPlaceholder")}
                  />
                </FormField>

                <FormField label={t("BrandWebsiteLabel")}>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    type="text"
                    placeholder={t("BrandWebsitePlaceholder")}
                  />
                </FormField>

                <FormField label={t("Description")}>
                  <Textarea
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("BrandDescriptionPlaceholder")}
                  />
                </FormField>

                <FormField label={t("BrandLogoLabel")}>
                  <Uploader
                    imageUrl={logoUrl}
                    setImageUrl={setLogoUrl}
                    folder="brand"
                    targetWidth={238}
                    targetHeight={238}
                  />
                </FormField>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full"
                  >
                    <span className="mr-2">
                      <FiPlus />
                    </span>
                    {editId ? t("UpdateBrand") : t("AddNewBrand")}
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

          {/* Right: Brands list */}
          <div className="lg:col-span-3">
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
              <CardBody>
                {/* Import / Export toolbar */}
                <div className="flex flex-wrap items-start gap-3 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                  <div ref={exportDropdownRef} className="relative">
                    <Button
                      type="button"
                      disabled={isExporting}
                      onClick={() => setIsExportOpen((prev) => !prev)}
                      variant="outline"
                      size="sm"
                    >
                      <FiDownload className="mr-2" />
                      <span>{t("Export")}</span>
                    </Button>
                    {isExportOpen && (
                      <ul className="absolute mt-1 w-44 rounded-md shadow-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 z-40">
                        <li>
                          <Button
                            type="button"
                            onClick={handleExportCSV}
                            variant="ghost"
                            size="sm"
                            className="w-full flex items-center justify-start gap-2 px-4 py-2"
                          >
                            <BsFileEarmarkMedical className="w-4 h-4" />
                            {t("ExportToCSV")}
                          </Button>
                        </li>
                        <li>
                          <Button
                            type="button"
                            onClick={handleExportJSON}
                            variant="ghost"
                            size="sm"
                            className="w-full flex items-center justify-start gap-2 px-4 py-2"
                          >
                            <BsFileEarmarkCode className="w-4 h-4" />
                            {t("ExportToJSON")}
                          </Button>
                        </li>
                      </ul>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => setIsImportBoxShown((prev) => !prev)}
                    variant="outline"
                    size="sm"
                  >
                    <FiUpload className="mr-2" />
                    <span>{t("Import")}</span>
                  </Button>


                  {isImportBoxShown && (
                    <div className="w-full flex flex-wrap gap-2">
                      <div className="h-10 border border-dashed border-emerald-500 rounded-md flex-grow">
                        <label className="w-full h-10 rounded-lg flex items-center px-2 text-xs dark:text-gray-400 leading-none cursor-pointer">
                          <Input
                            disabled={isImporting}
                            type="file"
                            accept=".json"
                            onChange={handleSelectFile}
                            className="hidden"
                          />
                          {fileName ? (
                            <span className="truncate">{fileName}</span>
                          ) : (
                            <>
                              <FiUploadCloud className="mr-2 text-emerald-500 text-lg dark:text-gray-400" />
                              {t("SelectYourJSON")} {t("Brands")} {t("File")}
                            </>
                          )}
                          {fileName && (
                            <span
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveSelectFile();
                              }}
                              className="text-red-500 focus:outline-none ml-auto text-lg"
                            >
                              <FiXCircle />
                            </span>
                          )}
                        </label>
                      </div>
                      <Button
                        type="button"
                        disabled={isImporting}
                        onClick={handleImportSubmit}
                        className="h-10 px-4"
                      >
                        <span className="mr-1">
                          <FiPlus />
                        </span>
                        {t("ImportNow")}
                      </Button>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleSubmitForAll}
                  className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
                >
                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Input
                      ref={searchRef}
                      type="search"
                      name="search"
                      placeholder={t("SearchBrandsPlaceholder")}
                    />
                    <Button
                      type="submit"
                      className="hidden"
                    />

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
                      <option value="true">{t("StatusActive")}</option>
                      <option value="false">{t("StatusInactive")}</option>
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
                      <TableCell>{t("Logo")}</TableCell>
                      <TableCell>{t("Name")}</TableCell>
                      <TableCell>{t("BrandSlugLabel")}</TableCell>
                      <TableCell className="text-center">{t("Status")}</TableCell>
                      <TableCell className="text-center">{t("Actions")}</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {brandList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <span className="block text-center text-sm text-gray-400 py-6">
                            {t("NoBrandsRightNow")}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    {brandList.map((brand) => (
                      <TableRow key={brand._id}>
                        <TableCell>
                          {brand.logo ? (
                            <img
                              src={brand.logo}
                              alt={brand.name}
                              className="w-10 h-10 object-contain rounded border border-gray-100 dark:border-gray-600"
                            />
                          ) : (
                            <span className="text-sm text-gray-400">â€”</span>

                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className="block font-semibold truncate max-w-[160px]"
                            title={brand.name}
                          >
                            {brand.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="block text-sm truncate max-w-[160px]"
                            title={brand.slug}
                          >
                            {brand.slug}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusToggle
                            id={brand._id}
                            status={brand.status}
                            onClick={() => handleStatusToggleClick(brand)}
                          />
                        </TableCell>
                        <TableCell>
                          <TableActions
                            onEdit={() => handleEdit(brand)}
                            onDelete={() => handleDeleteClick(brand)}
                            disabled={submitting || isDeleting}
                          />
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
                    label={t("BrandsPageNavigation")}
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

export default Brands;
