import React, { useContext } from "react";
import { Redirect, Route } from "react-router-dom";
import { AdminContext } from "@/context/AdminContext";

// Mirror of PrivateRoute, but for the rider-only driver dashboard: only a
// logged-in rider session may render the route. An admin session gets sent
// back to their own dashboard instead of the driver app, and an anonymous
// visitor gets sent to /login.
const RiderPrivateRoute = ({ children, ...rest }) => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;

  return (
    <Route
      {...rest}
      render={({ location }) => {
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

        if (adminInfo.accountType !== "rider") {
          return <Redirect to="/dashboard" />;
        }

        return children;
      }}
    />
  );
};

export default RiderPrivateRoute;
