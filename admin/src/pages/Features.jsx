import { Card, CardBody, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import FeatureServices from "@/services/FeatureServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import FeatureDrawer from "@/components/drawer/FeatureDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import { Button } from "@sofia/ui";

const Features = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreateFeature = hasPermission("features", "create");
  const canUpdateFeature = hasPermission("features", "update");
  const canDeleteFeature = hasPermission("features", "delete");

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["features", currentPage, searchText, categoryFilter, statusFilter],
    queryFn: async () => {
      return await FeatureServices.getAllFeatures({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        category: categoryFilter,
        status: statusFilter,
        sort: "-createdAt",
      });
    },
  });

  const features = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(features.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchText("");
    setCategoryFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await FeatureServices.deleteFeature(id);
      successMessage(t("FeatureDeleteSuccess") || "Feature deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["features"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || t("FeatureDeleteFailed") || "Failed to delete feature");
    }
  };

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  const handleChangePage = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      <PageTitle>{t("FeaturesPageTitle") || "Features"}</PageTitle>

      <MainDrawer>
        <FeatureDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSearchSubmit}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
            >
              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <Input
                  type="search"
                  placeholder={t("SearchFeature") || "Search by feature name or code"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllCategories") || "All Categories"}</option>
                  <option value="billing">{t("FeatureCategoryBilling") || "Billing"}</option>
                  <option value="limits">{t("FeatureCategoryLimits") || "Limits"}</option>
                  <option value="access">{t("FeatureCategoryAccess") || "Access"}</option>
                </select>
              </div>

              <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t("AllStatus")}</option>
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-grow-0">
                <div className="w-full mx-1">
                  <Button type="submit" className="h-12 w-full bg-emerald-700">
                    {t("Filter")}
                  </Button>
                </div>

                <div className="w-full mx-1">
                  <Button
                    layout="outline"
                    onClick={handleReset}
                    type="button"
                    className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                  >
                    <span className="text-black dark:text-gray-200">
                      {t("Reset")}
                    </span>
                  </Button>
                </div>

                {canCreateFeature && (
                  <div className="w-full mx-1">
                    <Button
                      onClick={() => {
                        setServiceId(undefined);
                        toggleDrawer();
                      }}
                      className="h-12 w-full rounded-md whitespace-nowrap"
                    >
                      <span className="mr-2 flex items-center">
                        <FiPlus />
                      </span>
                      {t("AddFeature") || "Add Feature"}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {isLoading ? (
        <TableLoading row={12} col={8} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error?.message || error}</span>
      ) : features?.length !== 0 ? (
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
                <TableCell>{t("Name")}</TableCell>
                <TableCell>{t("Code")}</TableCell>
                <TableCell>{t("FeatureGroup") || "Feature Group"}</TableCell>
                <TableCell>{t("Category")}</TableCell>
                <TableCell>{t("Description")}</TableCell>
                <TableCell>{t("Status")}</TableCell>
                <TableCell>{t("CreatedDate")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {features.map((feature, i) => (
                <TableRow key={i + 1}>
                  <TableCell>
                    <CheckBox
                      type="checkbox"
                      name={feature?.name}
                      id={feature._id}
                      handleClick={(e) => {
                        const { id, checked } = e.target;
                        setIsCheck([...isCheck, id]);
                        if (!checked) {
                          setIsCheck(isCheck.filter((item) => item !== id));
                        }
                      }}
                      isChecked={isCheck?.includes(feature._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{feature.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{feature.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {feature.featureGroup?.name || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{feature.category || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description || "-"}
                    </span>
                  </TableCell>
                   <TableCell>
                     <span className="text-sm">
                       {feature.status === "active" ? t("Active") : t("Inactive")}
                     </span>
                   </TableCell>
                   <TableCell>
                     <span className="text-sm">
                       {feature.createdAt
                         ? new Date(feature.createdAt).toLocaleDateString()
                         : "-"}
                     </span>
                   </TableCell>
                   <TableCell>
                     <div className="flex justify-center">
                       <ActionMenu
                         id={feature._id}
                         title={feature.name}
                         isCheck={isCheck}
                         handleUpdate={canUpdateFeature ? handleUpdate : undefined}
                         handleModalOpen={
                           canDeleteFeature
                             ? (id, title) => {
                                 setServiceId(id);
                                 handleDelete(id);
                               }
                             : undefined
                         }
                         showEdit={canUpdateFeature}
                         showDelete={canDeleteFeature}
                       />
                     </div>
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableFooter>
            <Pagination
              totalResults={pagination.total || 0}
              resultsPerPage={pageSize}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("NoFeatures") || "Sorry, There are no features right now."} />
      )}
    </>
  );
};

export default Features;