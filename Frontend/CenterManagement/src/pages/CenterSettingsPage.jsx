import { Loader2, Palette, Save, Upload } from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../components/common/Spinner";
import { useBranding } from "../context/useBranding";
import { centerService } from "../services/centerService";
import { resolveImageUrl } from "../utils/media";

const DEFAULT_COLOR = "#1e3a8a";

export default function CenterSettingsPage() {
  const { refresh } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasCenter, setHasCenter] = useState(true);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    description: "",
    logoUrl: null,
    themeColor: DEFAULT_COLOR,
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await centerService.getMyCenter();
        const center = response?.data;
        if (!active) return;

        if (!center) {
          setHasCenter(false);
          return;
        }

        setForm({
          name: center.name || "",
          phone: center.phone || "",
          address: center.address || "",
          description: center.description || "",
          logoUrl: center.logoUrl || null,
          themeColor: center.themeColor || DEFAULT_COLOR,
        });
      } catch {
        toast.error("تعذر تحميل بيانات المركز");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await centerService.uploadLogo(file);
      if (response?.succeeded === false || !response?.data) {
        toast.error(response?.message || "تعذر رفع الشعار");
        return;
      }
      setField("logoUrl", response.data);
      toast.success("تم رفع الشعار، لا تنس الحفظ");
    } catch {
      toast.error("تعذر رفع الشعار");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("اسم المركز مطلوب");
      return;
    }

    setSaving(true);
    try {
      const response = await centerService.updateMyCenter({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        logoUrl: form.logoUrl,
        themeColor: form.themeColor,
      });

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حفظ التغييرات");
        return;
      }

      toast.success("تم حفظ بيانات المركز بنجاح");
      await refresh();
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10">
        <Spinner msg="جارٍ تحميل إعدادات المركز..." />
      </div>
    );
  }

  if (!hasCenter) {
    return (
      <div className="p-10 flex flex-col items-center gap-3 text-text-muted">
        <Palette size={40} />
        <p>لا يوجد مركز مرتبط بهذا الحساب</p>
      </div>
    );
  }

  const logoPreview = resolveImageUrl(form.logoUrl);
  const inputClass =
    "w-full p-2.5 rounded-xl border border-surface-border bg-surface-muted text-text-main focus:outline-none focus:border-primary";
  const labelClass = "block text-sm font-medium mb-1 text-text-main";

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-text-main">
          إعدادات المركز والهوية
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-border bg-surface-muted">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="شعار المركز"
                className="h-full w-full object-contain"
              />
            ) : (
              <Palette className="h-8 w-8 text-text-muted" />
            )}
          </div>
          <div className="space-y-2">
            <label className={labelClass}>شعار المركز</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-xl border border-surface-border px-4 py-2.5 font-bold text-text-main transition-all hover:bg-surface-muted disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "جارٍ الرفع..." : "اختيار صورة"}
            </button>
            <p className="text-xs text-text-muted">PNG أو JPG أو WEBP</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>اسم المركز *</label>
          <input
            type="text"
            className={inputClass}
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>هاتف المركز</label>
            <input
              type="text"
              dir="ltr"
              className={inputClass}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>لون الهوية</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-11 w-14 cursor-pointer rounded-lg border border-surface-border bg-surface-muted"
                value={form.themeColor}
                onChange={(e) => setField("themeColor", e.target.value)}
              />
              <input
                type="text"
                dir="ltr"
                className={inputClass}
                value={form.themeColor}
                onChange={(e) => setField("themeColor", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>العنوان</label>
          <input
            type="text"
            className={inputClass}
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>وصف</label>
          <textarea
            rows={3}
            className={inputClass}
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
}
