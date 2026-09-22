import React, { useContext } from "react";
import Switch from "react-switch";
import { useLocation } from "react-router-dom";

//internal import
import { SidebarContext } from "@/context/SidebarContext";
import ProductCategoryServices from "@/services/ProductCategoryServices";
import CouponServices from "@/services/CouponServices";
import CurrencyServices from "@/services/CurrencyServices";
import PlatformCouponServices from "@/services/PlatformCouponServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const ShowHideButton = ({ id, status, category, currencyStatusName }) => {
  const location = useLocation();
  const { setIsUpdate } = useContext(SidebarContext);

  const handleChangeStatus = async (id) => {
    // return notifyError("This option disabled for this option!");
    try {
      let newStatus;
      if (status === "show") {
        newStatus = "hide";
      } else {
        newStatus = "show";
      }

      if (location.pathname === "/categories" || category) {
        // product categories use active/inactive, not the show/hide enum the
        // other tables toggle
        const res = await ProductCategoryServices.updateStatus(id, {
          status: status === "active" ? "inactive" : "active",
        });
        setIsUpdate(true);
        notifySuccess(res.message);
      }

      if (location.pathname === "/products") {
        // product status enum is draft | published | archived
        const productStatus = status === "published" ? "draft" : "published";
        const res = await ProductServices.updateStatus(id, {
          status: productStatus,
        });
        setIsUpdate(true);
        notifySuccess(res.message);
      }

      if (location.pathname === "/currencies") {
        if (currencyStatusName === "status") {
          const res = await CurrencyServices.updateEnabledStatus(id, {
            status: newStatus,
          });
          setIsUpdate(true);
          notifySuccess(res.message);
        } else {
          const res = await CurrencyServices.updateLiveExchangeRateStatus(id, {
            live_exchange_rates: newStatus,
          });
          setIsUpdate(true);
          notifySuccess(res.message);
        }
      }

      if (location.pathname === "/coupons") {
        const res = await CouponServices.updateStatus(id, {
          status: newStatus,
        });
        setIsUpdate(true);
        notifySuccess(res.message);
      }

      if (location.pathname === "/platform-coupons") {
        const res = await PlatformCouponServices.updateStatus(id, {
          status: newStatus,
        });
        setIsUpdate(true);
        notifySuccess(res.message);
      }

      if (location.pathname === "/our-staff") {
        const res = await CouponServices.updateStaffStatus(id, {
          status: newStatus,
        });
        setIsUpdate(true);
        notifySuccess(res.message);
      }
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
  };

  return (
    <Switch
      onChange={() => handleChangeStatus(id)}
      checked={
        status === "show" || status === "published" || status === "active"
      }
      className="react-switch md:ml-0"
      uncheckedIcon={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: 120,
            fontSize: 14,
            color: "white",
            paddingRight: 22,
            paddingTop: 1,
          }}
        ></div>
      }
      width={30}
      height={15}
      handleDiameter={13}
      offColor="#E53E3E"
      onColor={"#2F855A"}
      checkedIcon={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: 73,
            height: "100%",
            fontSize: 14,
            color: "white",
            paddingLeft: 20,
            paddingTop: 1,
          }}
        ></div>
      }
    />
  );
};

export default ShowHideButton;
