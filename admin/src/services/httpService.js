import axios from "axios";
import Cookies from "js-cookie";
import { getAccessToken } from "./tokenStore";

const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_APP_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_APP_API_BASE_URL is required in production");
}

const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 50000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

instance.interceptors.request.use(function (config) {
  const token = getAccessToken();

  const publicPaths = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh-token",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];
  const isPublicPath = publicPaths.some((path) =>
    config.url?.startsWith(path)
  );

  let company;
  if (Cookies.get("company")) {
    company = Cookies.get("company");
  }

  const headers = {
    ...config.headers,
    company: company ? company : undefined,
  };

  if (!isPublicPath && token) {
    headers.authorization = `Bearer ${token}`;
  }

  // The instance default sets Content-Type: application/json on every
  // request. For a FormData body (file uploads) that's actively wrong 
  // the browser needs to set its own `multipart/form-data; boundary=...`
  // header, and a forced application/json here makes multer see no
  // multipart body at all, so req.file is always undefined ("No file
  // uploaded!") regardless of what was actually attached client-side.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  const outgoing = {
    url: config.url,
    method: config.method,
    params: config.params,
    hasToken: Boolean(token),
    isPublicPath,
  };
  if (config.url?.includes("/users") || config.url?.includes("/roles") || config.url?.includes("/permissions")) {
    console.log("[httpService] outgoing request:", outgoing);
  }

  return {
    ...config,
    headers,
  };
});

instance.interceptors.response.use(
  (response) => {
    if (response?.config?.url?.includes("/users") || response?.config?.url?.includes("/roles") || response?.config?.url?.includes("/permissions")) {
      console.log("[httpService] response received:", response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    const message = error?.response?.data?.message || error?.message || "";
    const isStoreIdRequired =
      typeof message === "string" &&
      /storeId is required|storeId est requis|Valid storeId is required/i.test(
        message
      );

    if (isStoreIdRequired) {
      const adminInfo =
        (typeof window !== "undefined" &&
          (() => {
            try {
              return JSON.parse(Cookies.get("adminInfo") || "null");
            } catch {
              return null;
            }
          })()) ||
        null;

      const isSuperAdmin =
        adminInfo?.isSuperAdmin || adminInfo?.userType === "superadmin";

      if (isSuperAdmin) {
        return Promise.resolve({
          data: error?.config?.method === "get"
            ? []
            : { success: true, data: null },
          status: 200,
          statusText: "OK",
          headers: error?.response?.headers || {},
          config: error?.config || {},
          request: error?.request || null,
        });
      }
    }

    if (error?.config?.url?.includes("/users") || error?.config?.url?.includes("/roles") || error?.config?.url?.includes("/permissions")) {
      console.log("[httpService] response error:", error.config.url, error.response?.status, error?.response?.data || error?.message);
    }
    return Promise.reject(error);
  }
);

const responseBody = (response) => response.data;

const requests = {
  get: (url, params) => instance.get(url, { params }).then(responseBody),
  post: (url, body, config = {}) => instance.post(url, body, config).then(responseBody),
  put: (url, body) => instance.put(url, body).then(responseBody),
  patch: (url, body) => instance.patch(url, body).then(responseBody),
  delete: (url) => instance.delete(url).then(responseBody),
  get: (url, params, config = {}) => instance.get(url, { params, ...config }).then(responseBody),
  post: (url, body, config = {}) => instance.post(url, body, config).then(responseBody),
  put: (url, body, config = {}) => instance.put(url, body, config).then(responseBody),
  patch: (url, body, config = {}) => instance.patch(url, body, config).then(responseBody),
  delete: (url, config = {}) => instance.delete(url, config).then(responseBody),
  getBlob: (url, params) =>
    instance.get(url, { params, responseType: "blob" }).then(responseBody),
};

export default requests;