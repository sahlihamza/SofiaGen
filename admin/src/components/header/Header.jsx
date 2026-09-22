import { Avatar, Badge, WindmillContext } from "@windmill/react-ui";
import Cookies from "js-cookie";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";

import {
  FiTrash2,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSun,
  FiMoon,
  FiBell,
  FiSettings,
  FiGlobe,
  FiShoppingBag,
  FiCheck,
  FiX,
  FiTool,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import cookies from "js-cookie";
import { useTranslation } from "react-i18next";

//internal import
import ellipse from "@/assets/img/icons/ellipse.svg";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { AdminContext } from "@/context/AdminContext";
import { useStoreContext } from "@/context/StoreContext";
import { SidebarContext } from "@/context/SidebarContext";
import useNotification from "@/hooks/useNotification";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError, notifySuccess } from "@/utils/toast";
import NotFoundTwo from "@/components/table/NotFoundTwo";
import NotificationServices from "@/services/NotificationServices";
import { humanizeNotificationType } from "@/utils/notificationHelpers";
import { emitUnreadCountChange } from "@/utils/notificationBus";
import SelectLanguage from "@/components/form/selectOption/SelectLanguage";
import UserServices from "@/services/UserServices";
import { invalidateAuthorizationContext } from "@/hooks/useAuthorizationContext";
import { setAccessToken } from "@/services/tokenStore";
import { Button } from "@sofia/ui";

const Header = () => {
  const { toggleSidebar, handleLanguageChange, setNavBar, navBar, currLang } =
    useContext(SidebarContext);
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;
  const isSuperAdmin = Boolean(adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin");
  const { stores, currentStoreId, selectStore } = useStoreContext() || {};
  const { mode, toggleMode } = useContext(WindmillContext);
  const pRef = useRef();
  const nRef = useRef();
  const sRef = useRef();

  const currentLanguageCode = cookies.get("i18next") || "en";

  const flagMap = {
    en: "us",
    ar: "sa",
    fr: "fr",
    de: "de",
    bn: "bd",
    hi: "in",
  };
  const activeFlagCode = currLang
    ? (currLang.flag || flagMap[currLang.iso_code?.toLowerCase()] || currLang.iso_code || "").toLowerCase()
    : flagMap[currentLanguageCode] || currentLanguageCode;

  const { t } = useTranslation();
  const {
    updated,
    setUpdated,
    unreadCount,
    recentNotifications,
    refreshRecent,
    refreshUnreadCount,
  } = useNotification();
  const { showDateTimeFormat } = useUtilsFunction();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  // The click-outside effect below only attaches its listener once, so it
  // would otherwise close over a stale, empty `recentNotifications` from
  // that first render â€” this ref always holds the current value for it.
  const recentNotificationsRef = useRef(recentNotifications);
  useEffect(() => {
    recentNotificationsRef.current = recentNotifications;
  }, [recentNotifications]);

  const handleLogOut = async () => {
  try {
    await UserServices.logout(); 
  } catch (err) {
    
    console.error(err?.response?.data?.message || err?.message);
  } finally {
    setAccessToken(null);
    invalidateAuthorizationContext();
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
    window.location.replace("/login");
  }
};

  // Closing is what actually marks the just-seen ones as read â€” same as
  // Facebook: reopening later shows them de-highlighted, not still bold.
  // Needs to run whether the dropdown closes via the bell button or a
  // click outside it, so it's a standalone function rather than inlined
  // into a single click handler.
  const markRecentSeenAsRead = async () => {
    const toMark = (recentNotificationsRef.current || []).filter((n) => n.status === "unread");
    if (toMark.length === 0) return;
    try {
      await Promise.all(toMark.map((n) => NotificationServices.markNotificationRead(n._id)));
      await refreshRecent();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const handleNotificationOpen = async () => {
    const opening = !notificationOpen;
    setNotificationOpen(opening);
    setProfileOpen(false);

    if (opening) {
      await refreshRecent();
      // Facebook-style: the badge clears the moment the bell is opened â€” it
      // means "seen", not "read".
      emitUnreadCountChange({ reset: true });
    } else {
      await markRecentSeenAsRead();
    }
  };
  const handleProfileOpen = () => {
    setProfileOpen(!profileOpen);
    setNotificationOpen(false);
  };
  const handleStoreOpen = () => {
    setStoreOpen(!storeOpen);
    setProfileOpen(false);
    setNotificationOpen(false);
  };
  const handleSelectStore = async (storeId) => {
    if (storeId === currentStoreId) {
      setStoreOpen(false);
      return;
    }
    try {
      await selectStore(storeId);
      setStoreOpen(false);
    } catch (err) {
      console.error(err?.response?.data?.message || err?.message);
    }
  };

  const handleExitStoreMode = async () => {
    try {
      await UserServices.deselectMyStore();
      notifySuccess(t("StoreExited") || "Retour en mode plateforme");
      window.location.reload();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to exit store mode");
    }
  };

  const currentStore = stores?.find((s) => s._id === currentStoreId);
  const isSuperAdminInStoreMode = Boolean(isSuperAdmin && currentStoreId);

  // handle notification status change
  const handleNotificationStatusChange = async (id) => {
    try {
      await NotificationServices.markNotificationRead(id);
      await refreshRecent();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // handle notification delete
  const handleNotificationDelete = async (id) => {
    try {
      await NotificationServices.deleteMyNotification(id);
      await refreshRecent();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!pRef?.current?.contains(e.target)) {
        setProfileOpen(false);
      }
      if (!nRef?.current?.contains(e.target)) {
        setNotificationOpen((wasOpen) => {
          if (wasOpen) markRecentSeenAsRead();
          return false;
        });
      }
      if (!sRef?.current?.contains(e.target)) {
        setStoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
  }, [pRef, nRef, sRef]);

  // const onChange = (event) => {
  //     i18next.changeLanguage(event.target.value);

  // }
  return (
    <>
      <header className="z-30 py-4 bg-white shadow-sm dark:bg-gray-800">
        <div className=" flex items-center justify-between h-full px-6 mx-auto text-emerald-500 dark:text-emerald-500">

          <Button
            type="button"
            variant="ghost"
            iconOnly
            size="sm"
            onClick={() => setNavBar(!navBar)}
            className="hidden lg:block focus:outline-none"
          >
            <svg
              className="w-5 h-5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </Button>

          {/* <!-- Mobile hamburger --> */}
          <Button

            className="p-1 mr-5 -ml-1 rounded-md lg:hidden focus:outline-none"
            onClick={toggleSidebar}
            aria-label="Menu"
          >
            <FiMenu className="w-6 h-6" aria-hidden="true" />

          </Button>
          <span></span>

          <ul className="flex justify-end items-center flex-shrink-0 space-x-6">
            {/* <!-- Store selector --> */}
            {!isSuperAdmin && (
              <li className="relative inline-block text-left" ref={sRef}>
                <Button

                  className="focus:outline-none flex items-center gap-2 text-gray-700 dark:text-gray-300"
                  onClick={handleStoreOpen}
                >
                  {(() => {
                    const activeStore = stores?.find(
                      (s) => s._id === currentStoreId
                    );
                    return activeStore?.logo ? (
                      <Avatar
                        className="w-6 h-6 bg-gray-50 border border-gray-200"
                        src={getLogoUrl(activeStore.logo)}
                        alt={activeStore.name}
                      />
                    ) : (
                      <FiShoppingBag className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                    );
                  })()}
                  <span className="md:inline-block hidden text-sm max-w-[10rem] truncate">
                    {stores?.find((s) => s._id === currentStoreId)?.name ||
                      t("SelectStore")}
                  </span>
                </Button>

                {storeOpen && (
                  <ul className="origin-top-right absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none max-h-72 overflow-y-auto">
                    {stores?.length > 0 ? (
                      stores.map((store) => (
                        <li
                          key={store._id}
                          onClick={() => handleSelectStore(store._id)}
                          className="cursor-pointer flex items-center justify-between font-serif font-medium py-2 px-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Avatar
                              className="w-6 h-6 flex-shrink-0 bg-gray-50 border border-gray-200"
                              src={
                                store.logo
                                  ? getLogoUrl(store.logo)
                                  : "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                              }
                              alt={store.name}
                            />
                            <span className="text-sm truncate">{store.name}</span>
                          </span>
                          {store._id === currentStoreId && (
                            <FiCheck
                              className="w-4 h-4 text-emerald-500 flex-shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </li>
                      ))
                    ) : (
                      <li className="py-2 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {t("NoStoreYet")}
                      </li>
                    )}

                    <li className="border-t border-gray-100 dark:border-gray-700">
                      {/* SO-13: not /stores â€” that's the store management/list

                          page. This is a regular staff member's own store
                          switcher, so "create a store" here means the
                          self-service onboarding flow. */}
                      <Link
                        to="/onboarding/create-store"
                        onClick={() => setStoreOpen(false)}
                        className="flex items-center font-serif font-medium py-2 px-4 text-sm text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t("CreateStore")}
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {isSuperAdminInStoreMode && (
              <li className="relative inline-block text-left">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                  <FiTool className="w-3 h-3" aria-hidden="true" />
                  {currentStore?.name || t("StoreMode")}
                  <Button

                    onClick={handleExitStoreMode}
                    className="ml-1 rounded-full hover:bg-emerald-100 focus:outline-none"
                    aria-label={t("ExitStoreMode") || "Exit store mode"}
                  >
                    <FiX className="w-3 h-3" aria-hidden="true" />
                  </Button>
                </span>
              </li>
            )}

            <li className="changeLanguage">
              <div className="dropdown">
                <Button className="dropbtn focus:outline-none flex items-center gap-2">

                  {activeFlagCode ? (
                    <div
                      className={`text-sm flag flex-shrink-0 ${activeFlagCode}`}
                    ></div>
                  ) : (
                    <FiGlobe className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  )}{" "}
                  <span className="md:inline-block hidden text-gray-900 dark:text-gray-300">
                    {currLang?.name || currentLanguageCode?.toUpperCase()}
                  </span>
                  <span className="md:hidden uppercase">
                    {currLang?.iso_code || currentLanguageCode}
                  </span>
                </Button>

                <SelectLanguage handleLanguageChange={handleLanguageChange} />
              </div>
            </li>

            {/* <!-- Theme toggler --> */}

            <li className="flex">
              <Button

                className="rounded-md focus:outline-none"
                onClick={toggleMode}
                aria-label="Toggle color mode"
              >
                {mode === "dark" ? (
                  <FiSun className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <FiMoon className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                )}
              </Button>
            </li>

            {/* <!-- Notifications menu --> */}
            <li className="relative inline-block text-left" ref={nRef}>
              <Button

                className="relative align-middle rounded-md focus:outline-none"
                onClick={handleNotificationOpen}
              >
                <FiBell
                  className="w-5 h-5 text-emerald-500"
                  aria-hidden="true"
                />

                {unreadCount > 0 && (
                  <span className="absolute z-10 top-0 right-0 inline-flex items-center justify-center p-1 h-5 w-5 text-xs font-medium leading-none text-red-100 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>

              {notificationOpen && (
                <div className="origin-top-right absolute md:right-0 -right-3 top-2 rounded-md shadow-lg bg-white dark:bg-gray-800  focus:outline-none">
                  <div
                    className={`${
                      recentNotifications?.length === 0
                        ? "h-40"
                        : recentNotifications?.length <= 2
                        ? "h-40"
                        : recentNotifications?.length <= 3
                        ? "h-56"
                        : "h-330"
                    } md:w-400 w-300`}
                  >
                    <Scrollbars>
                      {recentNotifications?.length === 0 ? (
                        <NotFoundTwo title="No new notification" />
                      ) : (
                        <ul className="block text-sm border-t border-gray-100 dark:border-gray-700 rounded-md">
                          {recentNotifications?.map((value, index) => {
                            return (
                              <li
                                key={index + 1}
                                className={`flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-100 ${
                                  value.status === "unread" && "bg-gray-50"
                                } hover:text-gray-800 dark:text-gray-400 ${
                                  value.status === "unread" &&
                                  "dark:bg-gray-800"
                                } dark:hover:bg-gray-900  dark:hover:text-gray-100 cursor-pointer`}
                              >
                                <Link
                                  to={
                                    value.actionUrl
                                      ? value.actionUrl
                                      : value.productId
                                      ? `/product/${value.productId}`
                                      : value.orderId
                                      ? `/order/${value.orderId}`
                                      : value.couponId
                                      ? "/coupons"
                                      : "/notifications"
                                  }
                                  className="flex items-center"
                                  onClick={() =>
                                    handleNotificationStatusChange(value._id)
                                  }
                                >
                                  <div className="notification-content">
                                    <h6 className="font-medium text-gray-500">
                                      {value?.title || humanizeNotificationType(value?.type)}
                                    </h6>

                                    <p className="flex items-center text-xs text-gray-400">
                                      {value.category === "tickets" ? (
                                        <Badge type="primary">Ticket</Badge>
                                      ) : value.productId ? (
                                        <Badge type="danger">Stock Out</Badge>
                                      ) : value.couponId ? (
                                        <Badge type="warning">Coupon</Badge>
                                      ) : (
                                        <Badge type="success">{value.category || value.type}</Badge>
                                      )}
                                      <span className="ml-2">
                                        {showDateTimeFormat(value.createdAt)}
                                      </span>
                                    </p>
                                  </div>

                                  {value.status === "unread" && (
                                    <span className="px-2 focus:outline-none">
                                      <img
                                        src={ellipse}
                                        width={12}
                                        height={12}
                                        alt="ellipse"
                                        className="w-3 h-3 text-emerald-600"
                                      />
                                    </span>
                                  )}
                                </Link>

                                <div className="group inline-block relative">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    iconOnly
                                    size="sm"
                                    onClick={() =>
                                      handleNotificationDelete(value._id)
                                    }
                                    className="px-2 group-hover:text-blue-500 text-red-500 focus:outline-none"
                                  >
                                    <FiTrash2 />
                                  </Button>

                                  <div className="absolute hidden group-hover:inline-block bg-gray-50 dark:text-red-400 mr-6 mb-1 right-0 z-50 px-3 py-2 text-sm font-medium text-red-600 rounded-lg shadow-sm tooltip dark:bg-gray-700">
                                    Delete
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {recentNotifications?.length > 0 && (
                        <div className="text-center py-2">
                          <Link
                            onClick={() => setNotificationOpen(false)}
                            to={"/notifications"}
                            className="focus:outline-none hover:underline transition ease-out duration-200"
                          >
                            Show all notifications
                          </Link>
                        </div>
                      )}
                    </Scrollbars>
                  </div>
                </div>
              )}
            </li>

            {/* <!-- Profile menu --> */}
            <li className="relative inline-block text-left" ref={pRef}>
              <Button

                className="rounded-full dark:bg-gray-500 bg-emerald-500 text-white h-8 w-8 font-medium mx-auto focus:outline-none"
                onClick={handleProfileOpen}
              >
                {adminInfo.image ? (
                  <Avatar
                    className="align-middle"
                    src={`${adminInfo.image}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span>{adminInfo.email[0].toUpperCase()}</span>
                )}
              </Button>

              {profileOpen && (
                <ul className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none">
                  <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link
                      to={
                        adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin"
                          ? "/platform/dashboard"
                          : "/dashboard"
                      }
                    >
                      <span className="flex items-center text-sm">
                        <FiGrid className="w-4 h-4 mr-3" aria-hidden="true" />
                        <span>{t("Dashboard")}</span>
                      </span>
                    </Link>
                  </li>

                  <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link to="/edit-profile">
                      <span className="flex items-center text-sm">
                        <FiSettings
                          className="w-4 h-4 mr-3"
                          aria-hidden="true"
                        />
                        <span>{t("EditProfile")}</span>
                      </span>
                    </Link>
                  </li>

                  <li
                    onClick={handleLogOut}
                    className="cursor-pointer justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <span className="flex items-center text-sm">
                      <FiLogOut className="w-4 h-4 mr-3" aria-hidden="true" />
                      <span>{t("LogOut")}</span>
                    </span>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </header>
    </>
  );
};

export default Header;
