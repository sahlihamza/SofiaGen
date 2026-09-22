import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import { Table, TableHeader, TableCell, TableFooter, TableContainer, Select, Input, Card, CardBody, Pagination } from "@windmill/react-ui";
import { FiPlus } from "react-icons/fi";
import { FiEdit, FiTrash2 } from "react-icons/fi";

//internal import

import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import UploadMany from "@/components/common/UploadMany";
import NotFound from "@/components/table/NotFound";
import ProductServices from "@/services/ProductServices";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import ProductTable from "@/components/product/ProductTable";
import CheckBox from "@/components/form/others/CheckBox";
import useProductFilter from "@/hooks/useProductFilter";
import DeleteModal from "@/components/modal/DeleteModal";
import ImportReportModal from "@/components/modal/ImportReportModal";
import ColumnMappingModal from "@/components/modal/ColumnMappingModal";
import ExportProductModal from "@/components/modal/ExportProductModal";
import useProductExport from "@/hooks/useProductExport";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import SelectCategory from "@/components/form/selectOption/SelectCategory";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const Products = () => {
  const { title, allId, handleDeleteMany, handleUpdateMany } =
    useToggleDrawer();
  const history = useHistory();
  const { hasPermission } = useGetCData();
  const canCreateProduct = hasPermission("products", "create");
  const canUpdateProduct = hasPermission("products", "update");
  const canDeleteProduct = hasPermission("products", "delete");

  const {
    lang,
    currentPage,
    handleChangePage,
    searchText,
    category,
    setCategory,
    searchRef,
    handleSubmitForAll,
    sortedField,
    setSortedField,
    limitData,
  } = useContext(SidebarContext);

  const { data, loading, error } = useAsync(() =>
    ProductServices.getAllProducts({
      page: currentPage,
      limit: limitData,
      category: category,
      productName: searchText,
      price: sortedField,
    })
  );

  // react hooks
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(data?.products.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };
  // handle reset field
  const handleResetField = () => {
    setCategory("");
    setSortedField("");
    searchRef.current.value = "";
  };

  // Products currently ticked in the table, resolved to full objects for the
  // "export selected only" path.
  const selectedProducts = (data?.products || []).filter((p) =>
    isCheck.includes(p._id)
  );

  const exporter = useProductExport({
    selectedProducts,
    totalDoc: data?.totalDoc,
    filters: { category, productName: searchText, price: sortedField },
  });

  const {
    serviceData,
    filename,
    isDisabled,
    handleSelectFile,
    handleUploadMultiple,
    handleRemoveSelectFile,
    importReport,
    closeImportReport,
    isMappingOpen,
    columns,
    rowCount,
    setColumnField,
    defaults,
    setDefaultValue,
    resetMapping,
    closeMapping,
    runImport,
    mappingErrors,
  } = useProductFilter(data?.products);

  return (
    <>
      <PageTitle>Products</PageTitle>
      {/* Bulk delete only. ProductTable renders its own DeleteModal for single
          rows when nothing is selected, and both share one isModalOpen flag â€”

          rendering both at once stacks two modals over each other. */}
      {isCheck?.length > 0 && (
        <DeleteModal ids={allId} setIsCheck={setIsCheck} title={title} />
      )}
      <BulkActionDrawer ids={allId} title="Products" />
      <ColumnMappingModal
        isOpen={isMappingOpen}
        columns={columns}
        rowCount={rowCount}
        errors={mappingErrors}
        defaults={defaults}
        onChangeField={setColumnField}
        onChangeDefault={setDefaultValue}
        onReset={resetMapping}
        onClose={closeMapping}
        onRun={runImport}
      />
      <ImportReportModal report={importReport} onClose={closeImportReport} />
      <ExportProductModal exporter={exporter} />
      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody className="">
            <form
              onSubmit={handleSubmitForAll}
              className="py-3 md:pb-0 grid gap-4 lg:gap-6 xl:gap-6 xl:flex"
            >
              <div className="flex-grow-0 sm:flex-grow md:flex-grow lg:flex-grow xl:flex-grow">
                {/* confirmInModal: picking a file opens the column mapping
                    window, which is where the import is confirmed or cancelled
                    â€” so no file is staged next to the button. */}

                <UploadMany
                  title="Products"
                  confirmInModal
                  filename={filename}
                  isDisabled={isDisabled}
                  totalDoc={data?.totalDoc}
                  onExportClick={exporter.open}
                  handleSelectFile={handleSelectFile}
                  handleUploadMultiple={handleUploadMultiple}
                  handleRemoveSelectFile={handleRemoveSelectFile}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                {canUpdateProduct && (
                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Button
                      disabled={isCheck.length < 1}
                      onClick={() => handleUpdateMany(isCheck)}
                      className="w-full rounded-md h-12 btn-gray text-gray-600"
                    >
                      <span className="mr-2">
                        <FiEdit />
                      </span>
                      Bulk Action
                    </Button>
                  </div>
                )}
                
                {canCreateProduct && (
                  <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                    <Button
                      onClick={() => history.push("/products/add")}
                      className="w-full rounded-md h-12"
                    >
                      <span className="mr-2">
                        <FiPlus />
                      </span>
                      Add Product
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 rounded-t-lg rounded-0 mb-4">
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
                  placeholder="Search Products"
                />
                <Button
                  type="submit"
                  className="absolute right-0 top-0 mt-5 mr-1"
                ></Button>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <SelectCategory setCategory={setCategory} lang={lang} />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Select onChange={(e) => setSortedField(e.target.value)}>
                  <option value="All" defaultValue hidden>
                    Price
                  </option>
                  <option value="low">Low to High</option>
                  <option value="high">High to Low</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                  <option value="date-added-asc">Date Added (Asc)</option>
                  <option value="date-added-desc">Date Added (Desc)</option>
                  <option value="date-updated-asc">Date Updated (Asc)</option>
                  <option value="date-updated-desc">Date Updated (Desc)</option>
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
                    onClick={handleResetField}
                    type="reset"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">Reset</span>
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={7} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8 rounded-b-lg">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    isChecked={isCheckAll}
                    handleClick={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Regular Price</TableCell>
                <TableCell>Sale Price</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell className="text-center">Details</TableCell>
                <TableCell className="text-center">Published</TableCell>
                <TableCell className="text-right">Actions</TableCell>
              </tr>
            </TableHeader>
            <ProductTable
              lang={lang}
              isCheck={isCheck}
              products={data?.products}
              setIsCheck={setIsCheck}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={data?.totalDoc}
              resultsPerPage={limitData}
              onChange={handleChangePage}
              label="Product Page Navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Product" />
      )}
    </>
  );
};

export default Products;
