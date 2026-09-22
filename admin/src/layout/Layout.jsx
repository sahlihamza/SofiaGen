import React, { useContext, Suspense, useEffect, lazy } from "react";
import { Switch, Route, Redirect, useLocation } from "react-router-dom";

//internal import
import Main from "@/layout/Main";
import Header from "@/components/header/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import { SidebarContext } from "@/context/SidebarContext";
import ThemeSuspense from "@/components/theme/ThemeSuspense";
import { routes } from "@/routes";
import SuperAdminGuard from "@/components/guards/SuperAdminGuard";
import AssistantLauncher from "@/components/ai/AssistantLauncher";
import { useBranding } from "@/hooks/useBranding";
const Page404 = lazy(() => import("@/pages/404"));

const Layout = () => {
  const { isSidebarOpen, closeSidebar, navBar } = useContext(SidebarContext);
  let location = useLocation();

  useBranding();

  const isOnline = navigator.onLine;

  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <>
      {!isOnline && (
        <div className="flex justify-center bg-red-600 text-white">
          You are in offline mode!{" "}
        </div>
      )}
      <div
        className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isSidebarOpen && "overflow-hidden"
          }`}
      >
        {navBar && <Sidebar />}

        <div className="flex flex-col flex-1 w-full">
          <Header />
          <Main>
            <Suspense fallback={<ThemeSuspense />}>
              <Switch>
                {routes.map((route, i) => {
                  const isPlatformProtectedRoute =
                    route.path?.startsWith("/platform");

                  return route.component ? (
                    isPlatformProtectedRoute ? (
                      <SuperAdminGuard
                        key={i}
                        exact
                        path={route.path}
                      >
                        <route.component />
                      </SuperAdminGuard>
                    ) : (
                      <Route
                        key={i}
                        exact={true}
                        path={`${route.path}`}
                        render={(props) => <route.component {...props} />}
                      />
                    )
                  ) : null;
                })}
                <Redirect exact from="/" to="/dashboard" />
                <Route component={Page404} />
              </Switch>
            </Suspense>
          </Main>
        </div>
      </div>
      <AssistantLauncher />
    </>
  );
};

export default Layout;
