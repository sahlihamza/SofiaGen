import { AdminContext } from "@/context/AdminContext";
import { routeAccessList } from "@/routes";
import { useLocation } from "react-router-dom";
import { useContext, useEffect, useMemo, useState } from "react";
import { resolveRoleName, toRoleArray } from "@/utils/roleUtils";
import { resolveSidebarAccess, isSuperAdmin } from "@/utils/permissions";
import { useAuthorizationContext } from "@/hooks/useAuthorizationContext";

const defaultAccessList = routeAccessList.map((route) => route.value);

const permissionModuleToRouteKeys = {
  dashboard: ["dashboard"],
  analytics: ["analytics"],
  products: ["products", "product"],
  categories: ["categories"],
  attributes: ["attributes"],
  coupons: ["coupons"],
  "platform-coupons": ["platform-coupons"],
  // Backend permission module is "Support Ticket" (with a space  see
  // seedPermissions.js), which normalizeRouteKey turns into "support-ticket"
  // (space -> dash), not the glued "supporttickets" this used to be keyed
  // under before the SFG-80 permission-naming fix.
  "support-ticket": ["support-tickets"],
  plans: ["plans", "plan-detail"],
  features: ["features"],
  "quota-types": ["quota-types", "quotatypes"],
  subscriptions: ["subscriptions"],
  invoices: ["invoices"],
  payments: ["payments"],
  "usage-tracking": ["usage-tracking"],
  customers: ["customers", "customer-order"],
  orders: ["orders", "order"],
  staff: ["our-staff"],
  riders: ["riders"],
  reviews: ["product-reviews"],
  posts: ["posts", "post-categories", "post-tags", "post-comments", "post"],
  settings: ["settings", "edit-profile", "roles", "permissions", "marketing"],
  stores: ["stores"],
  marketing: ["marketing"],
  "online-store": ["store", "customization", "themes", "store-settings"],
  notifications: ["notifications"],
  pages: ["404", "coming-soon", "currencies"],
  "platform-user": ["users", "platform-users"],
  "platform-role": ["roles", "platform-roles"],
  audit: ["audit", "platform-audit", "platform-audit-logs"],
  logs: ["logs", "platform-logs"],
  "security-logs": ["platform-logs"],
  "webhook-logs": ["platform-logs"],
  "job-logs": ["platform-logs"],
};

const normalizeRouteKey = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "-")
    : "";

const normalizePermissionKey = (value) =>
  typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, "_")
    : "";

const getRouteKeyFromPath = (pathname) => {
  const segments = pathname?.split("?")[0].split("/").filter(Boolean) || [];
  for (let i = segments.length - 1; i >= 0; i--) {
    const candidate = normalizeRouteKey(segments[i]);
    if (defaultAccessList.includes(candidate)) {
      return candidate;
    }
  }
  return segments[segments.length - 1] || "";
};

const extractPermissionKeys = (roleValue) => {
  return toRoleArray(roleValue).flatMap((item) => {
    const permissions = Array.isArray(item?.permissions) ? item.permissions : [];

    return permissions.map(
      (permission) =>
        `${normalizePermissionKey(permission?.module)}_${normalizePermissionKey(
          permission?.action
        )}`
    );
  });
};

const dedupe = (values) => [...new Set(values.filter(Boolean))];

const filterValidAccessKeys = (values) =>
  dedupe(values).filter((key) => defaultAccessList.includes(key));

const extractAccessFromPermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];

  return permissions.flatMap((permission) => {
    if (typeof permission === "string") {
      const parts = permission.split(/[._]/).filter(Boolean);
      if (parts.length <= 1) return [];
      const moduleKey = normalizeRouteKey(parts.slice(0, -1).join(" "));
      if (!moduleKey) return [];
      return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
    }

    const moduleKey = normalizeRouteKey(permission?.module);
    if (!moduleKey) return [];

    return permissionModuleToRouteKeys[moduleKey] || [moduleKey];
  });
};

const normalizeAccessList = (source) => {
  const sourceList = Array.isArray(source) ? source : source ? [source] : [];

  const access = sourceList.flatMap((item) => {
    if (typeof item === "string") {
      return [normalizeRouteKey(item)];
    }

    if (Array.isArray(item)) {
      return normalizeAccessList(item);
    }

    if (item && typeof item === "object") {
      if (typeof item.value === "string") {
        return [normalizeRouteKey(item.value)];
      }

      if (typeof item.path === "string") {
        return [getRouteKeyFromPath(item.path)];
      }

      if (item.module && item.action) {
        return extractAccessFromPermissions([item]);
      }

      // Handle populated role objects: { _id, name, permissions: [{module, action}, ...] }
      if (Array.isArray(item.permissions)) {
        return extractAccessFromPermissions(item.permissions);
      }
    }

    return [];
  });

  return filterValidAccessKeys(access);
};

const useGetCData = () => {
  const { state } = useContext(AdminContext);
  const { adminInfo } = state;

  const location = useLocation();
  const path = getRouteKeyFromPath(location?.pathname);

  const [role, setRole] = useState();
  const [accessList, setAccessList] = useState([]);
  const { permissions: contextPermissions } = useAuthorizationContext();
  const permissionSet = useMemo(() => {
    const merged = new Set(extractPermissionKeys(adminInfo?.role));
    if (Array.isArray(contextPermissions)) {
      contextPermissions.forEach((code) => {
        if (typeof code === "string") merged.add(code.toLowerCase().replace(/\./g, "_"));
      });
    }
    return merged;
  }, [adminInfo, contextPermissions]);

  // Function to decrypt data
  const decryptData = async (encryptedData, iv) => {
    const secretKey = import.meta.env.VITE_APP_ENCRYPT_PASSWORD;

    const keyBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(secretKey)
    );

    const encryptedArray = new Uint8Array(
      encryptedData.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    const ivBuffer = new Uint8Array(
      iv.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-CBC",
          iv: ivBuffer,
        },
        await crypto.subtle.importKey(
          "raw",
          keyBuffer,
          { name: "AES-CBC" },
          false,
          ["decrypt"]
        ),
        encryptedArray
      );

      const decodedData = new TextDecoder().decode(decrypted);
      return decodedData;
    } catch (error) {
      console.error("Decryption failed:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchDecryptedData = async () => {
      const resolvedNames = toRoleArray(adminInfo?.role)
        .map((item) => resolveRoleName(item))
        .filter(Boolean);
      const resolvedRole = resolvedNames.includes("Super Admin")
        ? "Super Admin"
        : resolvedNames.includes("Admin")
          ? "Admin"
          : resolvedNames.includes("adminstore")
            ? "adminstore"
            : resolvedNames[0] || "";

      if (isSuperAdmin(adminInfo)) {
        setRole("Super Admin");
        setAccessList(defaultAccessList);
        return;
      }

      if (resolvedRole === "Super Admin") {
        setRole(resolvedRole);
        setAccessList(defaultAccessList);
        return;
      }

      const accessFromRole = normalizeAccessList(adminInfo?.role);
      const accessFromList = normalizeAccessList(adminInfo?.access_list);
      const fallbackAccess = resolveSidebarAccess(adminInfo);
      const accessFromRoleOrList = accessFromRole.length
        ? accessFromRole
        : accessFromList.length
          ? accessFromList
          : fallbackAccess;

      console.log("useGetCData access debug:", {
        resolvedRole,
        accessFromRole,
        accessFromList,
        accessFromRoleOrList,
      });

      console.log("DEBUG adminInfo.role:", adminInfo?.role);
      console.log("DEBUG accessList final:", accessFromRoleOrList);

      if (accessFromRoleOrList.length > 0) {
        setRole(resolvedRole);
        setAccessList(accessFromRoleOrList);
        return;
      }

      if (adminInfo?.role) {
        setRole(adminInfo.role);
        const roleList = [];
        if (roleList.length > 0) {
          setAccessList(roleList);
          return;
        }
      }

      if (adminInfo?.data && adminInfo?.iv) {
        try {
          const decryptedString = await decryptData(
            adminInfo.data,
            adminInfo.iv
          );
          const decryptedArray = JSON.parse(decryptedString);

          const lastElement = decryptedArray.pop();
          setRole(
            typeof lastElement === "string"
              ? lastElement
              : resolveRoleName(lastElement)
          );
          setAccessList(normalizeAccessList(decryptedArray));
        } catch (error) {
          console.error("Failed to decrypt and parse data:", error);
          if (adminInfo?.role) {
            setAccessList([]);
          }
        }
      }
    };

    fetchDecryptedData();
  }, [adminInfo]);

  const hasPermission = (module, action) => {
    const isSuperAdmin =
      role === "Super Admin" ||
      Boolean(adminInfo?.isSuperAdmin) ||
      adminInfo?.userType === "superadmin";
    if (isSuperAdmin) return true;

    const key = `${normalizePermissionKey(module)}_${normalizePermissionKey(action)}`;
    return permissionSet.has(key);
  };

  return {
    role,
    path,
    accessList,
    hasPermission,
  };
};

export default useGetCData;
