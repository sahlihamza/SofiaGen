import React, { useContext } from "react";
import { useHistory } from "react-router-dom";

import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";

import { AdminContext } from "@/context/AdminContext";
import UserServices from "@/services/UserServices";
import { setAccessToken } from "@/services/tokenStore";
import { invalidateAuthorizationContext, useAuthorizationContext } from "@/hooks/useAuthorizationContext";
import PageSpinner from "@/components/theme/PageSpinner";
import EmptyState from "@/components/common/CEmptyState";
import { Button } from "@sofia/ui";

// SO-13: the state a user with zero active UserStore memberships lands on â€”
// they can log in and see this page, but nothing store-scoped is reachable
// until they either create their own store or are added to one. This page
// exists purely to make that state visible instead of leaving the admin
// shell in a confusing half-loaded one.
const NoStorePage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { dispatch } = useContext(AdminContext);
  const { hasStore, canCreateStore, isLoading } = useAuthorizationContext();

  if (isLoading) {
    return <PageSpinner />;
  }

  if (hasStore) {
    history.replace("/dashboard");
    return null;
  }

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span
            className="material-symbols-outlined text-emerald-700 text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dataset
          </span>
          <span className="text-2xl font-semibold tracking-tighter">SofiaGen</span>
        </div>

        <EmptyState
          className="bg-white border-slate-200 py-16 px-8"
          icon={
            <span className="material-symbols-outlined text-5xl text-slate-300">storefront</span>
          }
          title={t("NoStoreYet")}
          titleClassName="text-xl"
          description={
            canCreateStore
              ? t(
                  "NoStoreDescriptionCanCreate",
                  "You're not a member of any store yet. Create your own store to get started."
                )
              : t(
                  "NoStoreDescriptionCannotCreate",
                  "You're not a member of any store yet. Ask a platform administrator to add you to one."
                )
          }
          action={
            canCreateStore ? (
              <Button
                onClick={() => history.push("/onboarding/create-store")}
                className="h-11 px-6 bg-emerald-700 text-white rounded-2xl hover:bg-emerald-600"
              >
                {t("CreateStore")}
              </Button>
            ) : null
          }
        />

        <div className="mt-8 text-center">
          <Button
            type="button"
            onClick={handleLogOut}
            className="text-sm font-medium text-slate-500 hover:text-emerald-600 hover:underline"
          >
            {t("Logout", "Sign out")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NoStorePage;
