import React, { lazy, Suspense, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { ToastContainer } from "react-toastify";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import AccessibleNavigationAnnouncer from "@/components/AccessibleNavigationAnnouncer";
import PrivateRoute from "@/components/login/PrivateRoute";
import RiderPrivateRoute from "@/components/login/RiderPrivateRoute";
import { AdminContext } from "@/context/AdminContext";
import UserServices from "@/services/UserServices";
import { setAccessToken } from "@/services/tokenStore";
import { invalidateAuthorizationContext } from "@/hooks/useAuthorizationContext";
import PageSpinner from "@/components/theme/PageSpinner";

const Layout = lazy(() => import("@/layout/Layout"));
const Login = lazy(() => import("@/pages/Login"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const ForgetPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const DriverDashboard = lazy(() => import("@/pages/DriverDashboard"));
const AcceptInvitation = lazy(() => import("@/pages/AcceptInvitation"));
const NoStorePage = lazy(() => import("@/pages/onboarding/NoStorePage"));
const CreateStorePage = lazy(() => import("@/pages/onboarding/CreateStorePage"));
const SelectStorePage = lazy(() => import("@/pages/onboarding/SelectStorePage"));

const App = () => {
  const { dispatch } = useContext(AdminContext);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      // On tente toujours le refresh au démarrage : la session rélle est
      // porté par le cookie httpOnly "refreshToken" côté serveur, pas par
      // le cookie "adminInfo" (simple cache client, peut être absent/expiré
      // sans que la session serveur soit invalide).
      try {
        const res = await UserServices.refreshToken();
        setAccessToken(res.accessToken);

        if (res.data) {
          const cookieOptions = {
            expires: 0.5,
            sameSite: window.location.protocol === "https:" ? "None" : "Lax",
            secure: window.location.protocol === "https:",
          };
          dispatch({ type: "USER_LOGIN", payload: res.data });
          Cookies.set("adminInfo", JSON.stringify(res.data), cookieOptions);
        }
      } catch (err) {
        Cookies.remove("adminInfo");
        invalidateAuthorizationContext();
        dispatch({ type: "USER_LOGOUT" });
      }
      setCheckingSession(false);
    };

    restoreSession();
  }, [dispatch]);

  if (checkingSession) {
    return <PageSpinner />;
  }

  return (
    <>
      <Router>
        <ToastContainer position="top-center" style={{ zIndex: 999999 }} />
        <AccessibleNavigationAnnouncer />
        <Suspense fallback={<PageSpinner />}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={SignUp} />
            <Route path="/forgot-password" component={ForgetPassword} />
            <Route path="/reset-password/:token" component={ResetPassword} />
            <Route path="/invite" component={AcceptInvitation} />

            <RiderPrivateRoute path="/driver-dashboard">
              <Route path="/driver-dashboard" component={DriverDashboard} />
            </RiderPrivateRoute>

            {/* SO-13: onboarding routes  reachable while authenticated even
                with zero stores, unlike everything under Layout below, which
                PrivateRoute now redirects away from until hasStore is true. */}
            <PrivateRoute path="/no-store">
              <Route path="/no-store" component={NoStorePage} />
            </PrivateRoute>
            <PrivateRoute path="/onboarding/create-store">
              <Route path="/onboarding/create-store" component={CreateStorePage} />
            </PrivateRoute>
            <PrivateRoute path="/select-store">
              <Route path="/select-store" component={SelectStorePage} />
            </PrivateRoute>

            <PrivateRoute>
              <Route path="/" component={Layout} />
            </PrivateRoute>
            <Redirect exact from="/" to="/login" />
          </Switch>
        </Suspense>
      </Router>
    </>
  );
};

export default App;