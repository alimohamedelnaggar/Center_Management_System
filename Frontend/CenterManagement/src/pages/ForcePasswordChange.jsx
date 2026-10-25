import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Key, Lock, LogOut } from "@/components/icons";
import apiClient from "../api/axios";
import { useAuth } from "../context/useAuth";
import { homeFor } from "../utils/homeRoute";
import { getPhone } from "../utils/jwt";

export default function ForcePasswordChange() {
  const {
    role,
    accessToken,
    setAccessToken,
    setMustChangePassword,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const phone = getPhone(accessToken) ?? "";
  const [form, setForm] = useState({
    currentPassword: phone,
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف");
      return;
    }
    if (phone && form.newPassword.trim() === phone) {
      toast.error("لا يمكن استخدام رقم الهاتف ككلمة مرور جديدة");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      toast.error("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("كلمتا المرور غير متطابقتين");
      return;
    }

    setSaving(true);
    try {
      const response = await apiClient.put("/Profile/ChangePassword", form);
      const data = response?.data;
      if (data?.succeeded === false) {
        toast.error(data?.message || "تعذر تغيير كلمة المرور");
        return;
      }

      // The API rotates the session: keep the new access token (without the
      // forced-change claim) so the user can continue without another login.
      const tokens = data?.data;
      if (tokens?.accessToken) {
        setAccessToken(tokens.accessToken);
      }
      setMustChangePassword(false);

      toast.success("تم تغيير كلمة المرور بنجاح");
      navigate(homeFor(role), { replace: true });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "حدث خطأ أثناء تغيير كلمة المرور",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const inputClass =
    "w-full rounded-xl border border-surface-border bg-surface-muted p-2.5 text-text-main focus:border-primary focus:outline-none";

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-surface-bg p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-text-main">
            تغيير كلمة المرور
          </h1>
          <p className="text-sm text-text-muted">
            تستخدم هذا الحساب كلمة مرور مؤقتة (رقم الهاتف). يجب اختيار كلمة مرور
            جديدة قبل المتابعة.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              كلمة المرور المؤقتة
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              className={inputClass}
              value={form.currentPassword}
              onChange={setField("currentPassword")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              كلمة المرور الجديدة
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className={inputClass}
              value={form.newPassword}
              onChange={setField("newPassword")}
            />
            <p className="mt-1 text-xs text-text-muted">
              8 أحرف على الأقل، ويجب ألا تكون رقم الهاتف أو كلمة المرور الحالية.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              className={inputClass}
              value={form.confirmPassword}
              onChange={setField("confirmPassword")}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-bold text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            <Key className="h-5 w-5" />
            {saving ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-border py-2.5 font-bold text-text-main transition hover:bg-surface-muted disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );
}
