import { Card, CardBody, Input, Pagination, Table, TableCell, TableContainer, TableFooter, TableHeader } from "@windmill/react-ui";

import { useContext, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { SidebarContext } from "@/context/SidebarContext";
import PlatformCouponServices from "@/services/PlatformCouponServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import PageTitle from "@/components/Typography/PageTitle";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlatformCouponDrawer from "@/components/drawer/PlatformCouponDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import PlatformCouponTable from "@/components/platformCoupon/PlatformCouponTable";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import useGetCData from "@/hooks/useGetCData";
import { Button } from "@sofia/ui";

const PlatformCoupons = () => {
  const { t } = useTranslation();
  const { toggleDrawer, lang } = useContext(SidebarContext);
  const { hasPermission } = useGetCData();
  const canCreatePlatformCoupon = hasPermission("platform_coupons", "create");
  const canUpdatePlatformCoupon = hasPermission("platform_coupons", "update");
  const canDeletePlatformCoupon = hasPermission("platform_coupons", "delete");
  const { data, loading, error } = useAsync(PlatformCouponServices.getAllCoupons);
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const { allId, serviceId, handleDeleteMany, handleUpdateMany } =
    useToggleDrawer();

  const {
    filename,
    isDisabled,
    couponRef,
    dataTable,
    serviceData,
    totalResults,
    resultsPerPage,
    handleChangePage,
    handleSelectFile,
    setSearchCoupon,
    handleSubmitCoupon,
    handleUploadMultiple,
    handleRemoveSelectFile,
  } = useFilter(data);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck((Array.isArray(data) ? data : []).map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  const handleResetField = () => {
    setSearchCoupon("");
    couponRef.current.value = "";
  };

  return (
    <>
      <PageTitle>{t("PlatformCouponsPageTitle")}</PageTitle>
      <DeleteModal
        ids={allId}
        setIsCheck={setIsCheck}
        title="Selected Platform Coupon"
      />
      <BulkActionDrawer ids={allId} title="Platform Coupons" />

      <MainDrawer>
        <PlatformCouponDrawer id={serviceId} />
      </MainDrawer>

      <AnimatedContent>
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
          <CardBody>
            <form
              onSubmit={handleSubmitCoupon}
              className="py-3 grid gap-4 lg:gap-6 xl:gap-6 xl:flex"
            >
              <div className="flex justify-start xl:w-1/2 md:w-full">
                <Input
                  ref={couponRef}
                  type="search"
                  placeholder={t("SearchPlatformCoupon")}
                />
              </div>

              <div className="lg:flex md:flex xl:justify-end xl:w-1/2 md:w-full md:justify-start flex-grow-0">
                {canUpdatePlatformCoupon && (
                  <div className="w-full md:w-40 lg:w-40 xl:w-40 mr-3 mb-3 lg:mb-0">
                    <Button
                      disabled={isCheck.length < 1}
                      onClick={() => handleUpdateMany(isCheck)}
                      className="w-full rounded-md h-12 btn-gray text-gray-600"
                    >
                      <span className="mr-2">
                        <FiPlus />
                      </span>
                      {t("BulkAction")}
                    </Button>
                  </div>
                )}

                {canDeletePlatformCoupon && (
                  <div className="w-full md:w-32 lg:w-32 xl:w-32 mr-3 mb-3 lg:mb-0">
                    <Button
                      disabled={isCheck.length < 1}
                      onClick={() => handleDeleteMany(isCheck)}
                      className="w-full rounded-md h-12 bg-red-500 btn-red"
                    >
                      <span className="mr-2">
                        <FiTrash2 />
                      </span>
                      {t("Delete")}
                    </Button>
                  </div>
                )}

                {canCreatePlatformCoupon && (
                  <div className="w-full md:w-48 lg:w-48 xl:w-48">
                    <Button
                      onClick={toggleDrawer}
                      className="w-full rounded-md h-12"
                    >
                      <span className="mr-2">
                        <FiPlus />
                      </span>
                      {t("AddPlatformCouponBtn")}
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      </AnimatedContent>

      {loading ? (
        <TableLoading row={12} col={8} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">
          {error?.response?.data?.message || error?.message || String(error)}
        </span>
      ) : serviceData?.length !== 0 ? (
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
                <TableCell>{t("CoupTblCode")}</TableCell>
                <TableCell>{t("CampaignName")}</TableCell>
                <TableCell>{t("Discount")}</TableCell>
                <TableCell>{t("ApplicableTo")}</TableCell>
                <TableCell className="text-center">{t("catPublishedTbl")}</TableCell>
                <TableCell>{t("CoupTblStartDate")}</TableCell>
                <TableCell>{t("CoupTblEndDate")}</TableCell>
                <TableCell>{t("CoupTblStatus")}</TableCell>
                <TableCell className="text-right">{t("CoupTblActions")}</TableCell>
              </tr>
            </TableHeader>
            <PlatformCouponTable
              lang={lang}
              isCheck={isCheck}
              platformCoupons={dataTable}
              setIsCheck={setIsCheck}
            />
          </Table>
          <TableFooter>
            <Pagination
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no platform coupons right now." />
      )}
    </>
  );
};

export default PlatformCoupons;