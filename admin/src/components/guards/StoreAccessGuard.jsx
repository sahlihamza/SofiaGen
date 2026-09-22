import React, { useContext } from "react";
import { Redirect, Route } from "react-router-dom";
import { AdminContext } from "@/context/AdminContext";

/**
 * Guard pour les routes liés  un store spécifique.
 *
 * Vérifie que :
 * - L'utilisateur est authentifié
 * - Ce n'est pas un rider
 * - Le storeId de la route appartient bien aux storeIds de l'utilisateur
 *   OU que l'utilisateur est superadmin (accès cross-store autorisé)
 *
 * Utilisation :
 *   <StoreAccessGuard path="/stores/:storeId/..." component={...} />
 */
const StoreAccessGuard = ({ children, ...rest }) => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;

  return (
    <Route
      {...rest}
      render={({ location, match }) => {
        if (!adminInfo?.email) {
          return (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: location },
              }}
            />
          );
        }

        if (adminInfo.accountType === "rider") {
          return <Redirect to="/driver-dashboard" />;
        }

        const isSuperAdmin = Boolean(
          adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin"
        );

        // Le superadmin a accès  tous les stores : on laisse passer.
        if (isSuperAdmin) {
          return children;
        }

        // Pour les autres, on vérifie que le storeId de l'URL est bien
        // dans la liste des stores autorisés.
        const requestedStoreId = match?.params?.storeId || match?.params?.id;
        const userStoreIds = (adminInfo?.storeIds || []).map(String);

        if (
          requestedStoreId &&
          userStoreIds.length > 0 &&
          !userStoreIds.includes(String(requestedStoreId))
        ) {
          return (
            <Redirect
              to={{
                pathname: "/dashboard",
                state: { from: location, reason: "store_access_denied" },
              }}
            />
          );
        }

        return children;
      }}
    />
  );
};

export default StoreAccessGuard;
