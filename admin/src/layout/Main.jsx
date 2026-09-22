import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import useGetCData from "@/hooks/useGetCData";
import { AdminContext } from "@/context/AdminContext";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";
import PageSpinner from "@/components/theme/PageSpinner";
import NotFoundPage from "@/pages/404";

// This gate used to source access exclusively from useGetCData's accessList,
// which is built from adminInfo.role (the platform User.role field cached at
// login). Store-scoped staff/owners hold their real permissions on
// UserStore.roleId instead  adminInfo.role is legitimately empty for them
//  so that list always fell back to a small hardcoded route-key list
// (getSidebarAccessFallbackForAdmin) that never included "settings" and
// several other pages, 404-ing them for every non-superadmin account.
// accessibleModules (from /me/context, already computed server-side from
// the real UserStore.roleId permissions) is the authoritative source and is
// checked first; the legacy accessList stays as a fallback for anything
// accessibleModules doesn't cover yet, so nothing regresses.
const Main = ({ children }) => {
  const { role, path, accessList } = useGetCData();
  const { state } = useContext(AdminContext);
  const { accessibleModules, isLoading: authContextLoading } = useAuthorizationContext();
  const location = useLocation();

  const isSuperAdmin = Boolean(
    state?.adminInfo?.isSuperAdmin || state?.adminInfo?.userType === "superadmin" || role === "Super Admin"
  );

  if (!isSuperAdmin && authContextLoading) {
    return <PageSpinner />;
  }

  const pathSegments = location.pathname.split("?")[0].split("/").filter(Boolean);
  const isPlatformRoute = pathSegments[0] === "platform";
  // `path` comes from useGetCData's generic "last URL segment that matches a
  // known route key" lookup, which was built for the legacy accessList and
  // collides with store settings sub-pages: "/settings/roles" and
  // "/settings/permissions" resolve to the bare keys "roles"/"permissions"
  // (reserved for the super-admin-only platform Roles/Permissions pages),
  // and "/store/my-subscription", "/store/my-usage", "/store/my-invoices"
  // resolve to keys that were never wired into any module at all. None of
  // these ever appear in accessibleModules, so they 404 for every
  // non-superadmin, including a Store Owner with full store permissions.
  // They're all store Settings sub-pages, so map them onto "settings".
  // Same collision for the Online Store group: "/store/themes",
  // "/store/customization" and "/store/store-settings" resolve to their own
  // bare keys ("themes", "customization", "store-settings") instead of the
  // real module key "online-store" that accessibleModules actually uses.
  const MODULE_KEY_OVERRIDES = {
    roles: "settings",
    permissions: "settings",
    "my-subscription": "subscriptions",
    "my-usage": "usage-tracking",
    "my-invoices": "invoices",
    themes: "online-store",
    customization: "online-store",
    "store-settings": "online-store",
    store: "online-store",
    // "/store/pages" (Level 1 Pages screen) falls back to the bare "pages"
    // key, which collides with an unrelated "Pages" (CMS) permission
    // module in the catalog  this route belongs with the rest of Online
    // Store, matching its sidebar moduleKey.
    pages: "online-store",
    // Returns (RMA) reuses the Orders permission module  a return is a
    // consequence of an order, not a separate permission surface.
    returns: "orders",
    "post-categories": "posts",
    "post-tags": "posts",
    "post-comments": "posts",
    "product-tags": "products",
    brands: "products",
    product: "products",
    "our-staff": "staff",
    "product-reviews": "reviews",
    "customer-order": "customers",
    order: "orders",
  };
  const modulePath = MODULE_KEY_OVERRIDES[path] || path;
  const hasModuleAccess = accessibleModules?.includes(modulePath);
  const hasDirectAccess = accessList?.includes(path);
  const hasPlatformPrefixedAccess = isPlatformRoute && accessList?.includes(`platform-${path}`);

  if (!isSuperAdmin && !hasModuleAccess && !hasDirectAccess && !hasPlatformPrefixedAccess) {
    return <NotFoundPage />;
  }

  return (
    <main className="h-full overflow-y-auto m-5">
      <div className="w-full max-w-none">{children}</div>
    </main>
  );
};

export default Main;
