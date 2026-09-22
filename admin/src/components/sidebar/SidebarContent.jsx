import React, { useContext, useState } from "react";
import { NavLink, Route } from "react-router-dom";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";
import { WindmillContext } from "@windmill/react-ui";
import { IoLogOutOutline } from "react-icons/io5";

//internal import
import sidebar from "@/routes/sidebar";
// import SidebarSubMenu from "SidebarSubMenu";
import logoDark from "@/assets/img/logo/logo-color.svg";
import logoLight from "@/assets/img/logo/logo-dark.svg";
import { getLogoUrl } from "@/utils/getLogoUrl";
import { AdminContext } from "@/context/AdminContext";
import { useStoreContext } from "@/context/StoreContext";
import SidebarSubMenu from "@/components/sidebar/SidebarSubMenu";
import { useAuthorizationContext, invalidateAuthorizationContext } from "@/hooks/useAuthorizationContext";
import { filterSidebarByPrivileges, isSuperAdmin as checkIsSuperAdmin } from "@/utils/permissions";
import { useBranding } from "@/hooks/useBranding";
import { Button } from "@sofia/ui";

const SidebarContent = () => {
  const { t } = useTranslation();
  const { mode } = useContext(WindmillContext);
  const { state, dispatch } = useContext(AdminContext);
  const auth = useAuthorizationContext();
  const { stores, currentStoreId } = useStoreContext() || {};
  const currentStore = stores?.find((s) => s._id === currentStoreId);
  const isSuperAdmin = Boolean(auth?.isSuperAdmin || checkIsSuperAdmin(state?.adminInfo));

  const filterRoutes = (routes) => {
    return routes
      .map((route) => {
        if (route.routes) {
          const validSubRoutes = filterRoutes(route.routes);
          if (validSubRoutes.length > 0) {
            return { ...route, routes: validSubRoutes };
          }
          return null;
        }
        if (route.requiresSuperAdmin && !isSuperAdmin) {
          return null;
        }

        if (route.moduleKey && !auth?.isLoading && !isSuperAdmin && !auth?.canModule?.(route.moduleKey)) {
          return null;
        }

        return route;
      })
      .filter(Boolean);
  };

  const privilegedSidebar = filterSidebarByPrivileges(sidebar, state?.adminInfo);
  const updatedSidebar = filterRoutes(privilegedSidebar);

  const { data: branding } = useBranding();
  const platformLogo = branding?.logo || "";
  const platformName = branding?.platformName || "SofiaGen";

  const resolvedLogo = currentStore?.logo
    ? getLogoUrl(currentStore.logo)
    : platformLogo
      ? getLogoUrl(platformLogo)
      : null;

  const handleLogOut = () => {
    invalidateAuthorizationContext();
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
  };

  return (
    <div className="py-4 text-gray-500 dark:text-gray-400">
      <a
        className="pl-6 flex items-center h-10 w-[250px] text-gray-900 dark:text-gray-200"
        href={isSuperAdmin ? "/platform/dashboard" : "/dashboard"}
      >
        {resolvedLogo ? (
          <img
            src={resolvedLogo}
            alt={currentStore?.name || platformName}
            className="h-full w-auto max-w-full object-contain"
          />
        ) : mode === "dark" ? (
          <img src={logoLight} alt={platformName} width="250" />
        ) : (
          <img src={logoDark} alt={platformName} width="250" />
        )}
      </a>
      <ul className="mt-8">
        {updatedSidebar?.map((route) =>
          route.routes ? (
            <SidebarSubMenu route={route} key={route.name} />
          ) : (
            <li className="relative" key={route.name}>
              <NavLink
                exact
                to={route.path === "/dashboard" && isSuperAdmin ? "/platform/dashboard" : route.path}
                target={`${route?.outside ? "_blank" : "_self"}`}
                className="px-6 py-4 inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-emerald-700 dark:hover:text-gray-200"
                activeClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg"
                rel="noreferrer"
              >
                <route.icon className="w-5 h-5" aria-hidden="true" />
                <span className="ml-4">{t(route.name, { defaultValue: route.name })}</span>
              </NavLink>
            </li>
          )
        )}
      </ul>
      <span className="lg:fixed bottom-0 px-6 py-6 w-64 mx-auto relative mt-3 block">
        <Button onClick={handleLogOut} size="large" className="w-full">
          <span className="flex items-center">
            <IoLogOutOutline className="mr-3 text-lg" />
            <span className="text-sm">{t("LogOut")}</span>
          </span>
        </Button>
      </span>
    </div>
  );
};

export default SidebarContent;
