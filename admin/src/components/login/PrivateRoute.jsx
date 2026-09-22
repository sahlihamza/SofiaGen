import React, { useContext } from "react";
import { Redirect, Route } from "react-router-dom";
import { AdminContext } from "@/context/AdminContext";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";

// SO-13: routes an authenticated user with zero stores must still be able to
// reach  everything else redirects to /no-store until hasStore is true.
const ONBOARDING_PATHS = ["/no-store", "/onboarding/create-store", "/select-store"];
const isOnboardingPath = (pathname) =>
  ONBOARDING_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Détermine la route d'atterrissage par défaut selon le type d'utilisateur.
 *
 * @param {object} adminInfo
 * @returns {string} chemin de redirection
 */
const getDefaultRouteForUserType = (adminInfo) => {
  if (!adminInfo) return "/login";

  const { accountType, userType, isSuperAdmin } = adminInfo;

  if (accountType === "rider") return "/driver-dashboard";
  if (isSuperAdmin || userType === "superadmin") return "/platform/dashboard";
  if (userType === "platform_admin") return "/dashboard";
  if (userType === "store_admin") return "/dashboard";
  if (userType === "staff") return "/dashboard";

  // fallback
  return "/dashboard";
};

/**
 * Route protégé principale.
 *
 * - Redirige vers /login si non authentifié
 * - Redirige les riders vers /driver-dashboard
 * - En cas d'accès  "/", redirige vers la route par défaut du userType
 */
const PrivateRoute = ({ children, ...rest }) => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;
  const { hasStore, isLoading: authContextLoading } = useAuthorizationContext();

  const isSuperAdmin = Boolean(
    adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin"
  );

  return (
    <Route
      {...rest}
      render={({ location: routeLocation }) => {
        if (!adminInfo?.email) {
          return (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: routeLocation },
              }}
            />
          );
        }

        // Riders authenticate through this same session, but they only ever
        // get their own driver dashboard  never the admin back-office shell.
        if (adminInfo.accountType === "rider") {
          return <Redirect to="/driver-dashboard" />;
        }

        // SO-13: a user with zero active UserStore memberships can log in
        // and reach their profile/onboarding, but nothing store-scoped 
        // everything under Layout assumes a current store exists. Wait for
        // the authorization context to actually resolve before deciding
        // (hasStore is undefined while loading) so this never fires on a
        // false negative during the first render after login.
        if (
          !isSuperAdmin &&
          !authContextLoading &&
          hasStore === false &&
          !isOnboardingPath(routeLocation.pathname)
        ) {
          return (
            <Redirect
              to={{ pathname: "/no-store", state: { from: routeLocation } }}
            />
          );
        }

        if (routeLocation.pathname === "/dashboard" && isSuperAdmin) {
          return <Redirect to="/platform/dashboard" />;
        }

        // Si on atterrit sur "/", on redirige vers la route par défaut
        // adapté au profil utilisateur.
        if (routeLocation.pathname === "/") {
          const target = getDefaultRouteForUserType(adminInfo);
          if (target !== routeLocation.pathname) {
            return (
              <Redirect
                to={{
                  pathname: target,
                  state: { from: routeLocation },
                }}
              />
            );
          }
        }

        return children;
      }}
    />
  );
};

export default PrivateRoute;
