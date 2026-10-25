
import axios from "axios";

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const ACCESS_CODES = {
  USER_INACTIVE: "هذا الحساب غير مُفعّل. تواصل مع إدارة المنصة.",
  USER_DELETED: "تم حذف هذا الحساب. تواصل مع إدارة المنصة.",
  CENTER_DELETED: "تم حذف المركز المرتبط بحسابك.",
  CENTER_INACTIVE: "مركزك غير مُفعّل حالياً.",
  CENTER_SUSPENDED: "تم إيقاف مركزك مؤقتاً. تواصل مع إدارة المنصة.",
  CENTER_EXPIRED: "انتهى اشتراك مركزك. تواصل مع إدارة المنصة للتجديد.",
  MODULE_DISABLED: "هذه الميزة غير مفعّلة في اشتراكك",
};

// A module the admin just disabled. The UI re-reads the enabled-module list
// (server cache is 45s) so the sidebar item disappears without a re-login.
export const MODULE_DISABLED_CODE = "MODULE_DISABLED";

// The account still uses its temporary password: the UI must route to the
// change-password screen (and the API blocks everything else until then).
export const PASSWORD_CHANGE_REQUIRED_CODE = "PASSWORD_CHANGE_REQUIRED";

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    const code = data?.code;

    if (code === PASSWORD_CHANGE_REQUIRED_CODE) {
      window.dispatchEvent(
        new CustomEvent("password:change-required", {
          detail: { message: data?.message },
        }),
      );
      return Promise.reject(error);
    }

    if (code === MODULE_DISABLED_CODE) {
      window.dispatchEvent(
        new CustomEvent("module:blocked", {
          detail: { module: data?.module ?? null, message: data?.message },
        }),
      );
      return Promise.reject(error);
    }

    if (code && ACCESS_CODES[code]) {
      window.dispatchEvent(
        new CustomEvent("access:blocked", {
          detail: { code, message: data?.message || ACCESS_CODES[code] },
        }),
      );
    }
    return Promise.reject(error);
  },
);

export default apiClient;
