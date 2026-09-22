import { Avatar, Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

import useUtilsFunction from "@/hooks/useUtilsFunction";
import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import PlatformCouponDrawer from "@/components/drawer/PlatformCouponDrawer";
import ShowHideButton from "@/components/table/ShowHideButton";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import useGetCData from "@/hooks/useGetCData";

const PlatformCouponTable = ({ isCheck, platformCoupons, setIsCheck }) => {
  const [updatedCoupons, setUpdatedCoupons] = useState([]);

  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  const { currency, showDateFormat, globalSetting, showingTranslateValue } =
    useUtilsFunction();
  const { hasPermission } = useGetCData();
  const canUpdatePlatformCoupon = hasPermission("platform_coupons", "update");
  const canDeletePlatformCoupon = hasPermission("platform_coupons", "delete");

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    const result = platformCoupons?.map((el) => {
      const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
        timeZone: globalSetting?.default_time_zone,
      });
      const newObj = {
        ...el,
        updatedDate: newDate,
      };
      return newObj;
    });
    setUpdatedCoupons(result);
  }, [platformCoupons, globalSetting?.default_time_zone]);

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer>
          <PlatformCouponDrawer id={serviceId} />
        </MainDrawer>
      )}

      <TableBody>
        {updatedCoupons?.map((coupon, i) => (
          <TableRow key={i + 1}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={coupon?.title}
                id={coupon._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(coupon._id)}
              />
            </TableCell>

            <TableCell>
              <div className="flex items-center">
                <div>
                  <span className="text-sm font-semibold">
                    {coupon?.code}
                  </span>{" "}
                </div>
              </div>
            </TableCell>

            <TableCell>
              <span className="text-sm"> {coupon?.title}</span>
            </TableCell>

            <TableCell>
              {coupon?.discountType === "percentage" ? (
                <span className="text-sm font-semibold">
                  {coupon?.discountValue}%
                </span>
              ) : (
                <span className="text-sm font-semibold">
                  {currency}
                  {coupon?.discountValue}
                </span>
              )}
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {coupon?.applicableTo || "subscription"}
              </span>
            </TableCell>

            <TableCell className="text-center">
              <ShowHideButton id={coupon._id} status={coupon.status} />
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {showDateFormat(coupon.startDate)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {showDateFormat(coupon.endDate)}
              </span>
            </TableCell>

            <TableCell className="align-middle">
              {dayjs().isAfter(dayjs(coupon.endDate)) ? (
                <Badge type="danger">Expired</Badge>
              ) : coupon.status === "active" ? (
                <Badge type="success">Active</Badge>
              ) : (
                <Badge type="warning">Inactive</Badge>
              )}
            </TableCell>

            <TableCell>
              <EditDeleteButton
                id={coupon?._id}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={coupon?.title}
                showEdit={canUpdatePlatformCoupon}
                showDelete={canDeletePlatformCoupon}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default PlatformCouponTable;