import React, { useContext } from "react";
import { Redirect, Route } from "react-router-dom";
import { AdminContext } from "@/context/AdminContext";

/**
 * Guard pour les routes réservées au SuperAdmin.
 *
 * Comportement :
 * - Si l'utilisateur n'est pas authentifié → redirection /login
 * - Si c'est un rider → redirection /driver-dashboard
 * - Si ce n'est PAS un superadmin (ni userType "superadmin") → redirection /dashboard
 * - Sinon → rend la route demandée
 *
 * Utilisation :
 *   <SuperAdminGuard path="/platform/users" component={UsersList} />
 *   ou
 *   <SuperAdminGuard>
 *     <Route path="/..." component={...} />
 *   </SuperAdminGuard>
 */
const SuperAdminGuard = ({ children, ...rest }) => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;

  const isSuperAdmin = Boolean(
    adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin"
  );

  return (
    <Route
      {...rest}
      render={(routeProps) => {
        if (!adminInfo?.email) {
          return (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: routeProps.location },
              }}
            />
          );
        }

        if (adminInfo.accountType === "rider") {
          return <Redirect to="/driver-dashboard" />;
        }

        if (!isSuperAdmin) {
          return (
            <Redirect
              to={{
                pathname: "/dashboard",
                state: { from: routeProps.location, reason: "insufficient_privileges" },
              }}
            />
          );
        }

        return React.isValidElement(children)
          ? React.cloneElement(children, routeProps)
          : children;
      }}
    />
  );
};

export default SuperAdminGuard;
