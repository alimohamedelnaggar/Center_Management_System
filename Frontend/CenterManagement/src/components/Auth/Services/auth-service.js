import { setAccessToken } from "../../../api/axios";
import { decodeToken } from "../../../utils/jwt";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const authService = {
  async login(phoneNumber, password) {
    let response;

    try {
      response = await fetch(
        `${API_BASE_URL}/Authentication/SignIn`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber,
            password,
          }),
        },
      );
    } catch {
      const networkError = new Error(
        "تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.",
      );
      networkError.isNetworkError = true;
      throw networkError;
    }

    const result = await response.json().catch(() => null);

    // التحقق من نجاح تسجيل الدخول
    if (!response.ok) {
      const error = new Error(
        result?.message ||
        result?.error ||
        "فشل تسجيل الدخول، راجع رقم الهاتف وكلمة المرور.",
      );
      error.status = response.status;
      error.body = result;
      throw error;
    }

    // التأكد من وجود Access Token
    if (!result || !result.accessToken) {
      console.error("Login response:", result);

      throw new Error(
        "تم استدعاء تسجيل الدخول، لكن لم يتم استلام Access Token.",
      );
    }

    // حفظ الـ Token
    setAccessToken(result.accessToken);

    // فحص بيانات المستخدم
    const decodedUser = decodeToken(result.accessToken);

    console.log("Login successful");
    console.log("Decoded token:", decodedUser);

    return result;
  },

  async refreshToken() {
    const response = await fetch(
      `${API_BASE_URL}/Authentication/refresh-token`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      setAccessToken(null);
      throw new Error("Unauthorized");
    }

    const result = await response.json();

    if (!result.accessToken) {
      throw new Error("لم يتم استلام Access Token جديد.");
    }

    setAccessToken(result.accessToken);

    return result;
  },

  async logout() {
    try {
      await fetch(
        `${API_BASE_URL}/Authentication/Logout`,
        {
          method: "POST",
          credentials: "include",
        },
      );
    } finally {
      setAccessToken(null);
    }
  },

  decode(token) {
    return decodeToken(token);
  },
};