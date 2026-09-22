import { Card, CardBody, Input, Pagination, Table, TableBody, TableCell, TableContainer, TableFooter, TableHeader, TableRow } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import QuotaTypeServices from "@/services/QuotaTypeServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import QuotaTypeDrawer from "@/components/drawer/QuotaTypeDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import useNotification from "@/hooks/useNotification";
import ActionMenu from "@/components/table/ActionMenu";
import { Button } from "@sofia/ui";

const QuotaTypes = () => {
  const { t } = useTranslation();
  const { toggleDrawer } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const { successMessage, errorMessage } = useNotification();
  const queryClient = useQueryClient();
  const { serviceId, setServiceId } = useToggleDrawer();

  const canCreateQuota = hasPermission("quota-types", "create");
  const canUpdateQuota = hasPermission("quota-types", "update");
  const canDeleteQuota = hasPermission("quota-types", "delete");

  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const pageSize = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["quota-types", currentPage, searchText],
    queryFn: async () => {
      return await QuotaTypeServices.getAllQuotaTypes({
        page: currentPage,
        limit: pageSize,
        search: searchText,
        sort: "-createdAt",
      });
    },
  });

  const quotaTypes = data?.data || [];
  const pagination = data?.pagination || {};

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(quotaTypes.map((li) => li._id));
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
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    try {
      await QuotaTypeServices.deleteQuotaType(id);
      successMessage(t("QuotaTypeDeleteSuccess") || "Quota type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["quota-types"] });
    } catch (err) {
      errorMessage(err?.response?.data?.message || t("QuotaTypeDeleteFailed") || "Failed to delete quota type");
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
      <PageTitle>{t("QuotaTypesPageTitle") || "Quota Types"}</PageTitle>

      <MainDrawer>
        <QuotaTypeDrawer id={serviceId} />
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
                  placeholder={t("SearchQuotaType") || "Search by quota type name or code"}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
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

                {canCreateQuota && (
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
                      {t("AddQuotaType") || "Add Quota Type"}
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
      ) : quotaTypes?.length !== 0 ? (
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
                <TableCell>{t("Name") || "Name"}</TableCell>
                <TableCell>{t("Code") || "Code"}</TableCell>
                <TableCell>{t("Unit") || "Unit"}</TableCell>
                <TableCell>{t("Min") || "Min"}</TableCell>
                <TableCell>{t("Max") || "Max"}</TableCell>
                <TableCell>{t("Default") || "Default"}</TableCell>
                <TableCell>{t("UnlimitedAllowed") || "Unlimited allowed"}</TableCell>
                <TableCell>{t("CreatedDate")}</TableCell>
                <TableCell className="text-right">...</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {quotaTypes.map((qt, i) => (
                <TableRow key={i + 1}>
                  <TableCell>
                    <CheckBox
                      type="checkbox"
                      name={qt?.name}
                      id={qt._id}
                      handleClick={(e) => {
                        const { id, checked } = e.target;
                        setIsCheck([...isCheck, id]);
                        if (!checked) {
                          setIsCheck(isCheck.filter((item) => item !== id));
                        }
                      }}
                      isChecked={isCheck?.includes(qt._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{qt.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{qt.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{qt.unit || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {qt.min !== null && qt.min !== undefined ? qt.min : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {qt.max !== null && qt.max !== undefined ? qt.max : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {qt.default !== null && qt.default !== undefined
                        ? qt.default
                        : "-"}
                    </span>
                  </TableCell>
                   <TableCell>
                     <span className="text-sm">
                       {qt.unlimitedAllowed ? t("Yes") : t("No")}
                     </span>
                   </TableCell>
                   <TableCell>
                     <span className="text-sm">
                       {qt.createdAt
                         ? new Date(qt.createdAt).toLocaleDateString()
                         : "-"}
                     </span>
                   </TableCell>
                   <TableCell>
                     <div className="flex justify-center">
                       <ActionMenu
                         id={qt._id}
                         title={qt.name}
                         isCheck={isCheck}
                         handleUpdate={canUpdateQuota ? handleUpdate : undefined}
                         handleModalOpen={
                           canDeleteQuota
                             ? (id, title) => {
                                 setServiceId(id);
                                 handleDelete(id);
                               }
                             : undefined
                         }
                         showEdit={canUpdateQuota}
                         showDelete={canDeleteQuota}
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
        <NotFound title={t("NoQuotaTypes") || "Sorry, There are no quota types right now."} />
      )}
    </>
  );
};

export default QuotaTypes;