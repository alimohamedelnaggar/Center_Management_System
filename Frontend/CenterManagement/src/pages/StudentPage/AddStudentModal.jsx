import {
  X,
  User,
  Phone,
  Users,
  CreditCard,
  UserPlus,
  Edit3,
} from "@/components/icons";

export default function AddStudentModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  groups = [],
  errors = {},
  mode = "add", // add | edit
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 dir-rtl text-right">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transition-all duration-200">
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {mode === "add" ? (
              <UserPlus className="w-6 h-6 text-[#1e3a8a]" />
            ) : (
              <Edit3 className="w-6 h-6 text-[#1e3a8a]" />
            )}
            <h2 className="text-xl font-bold text-[#1e3a8a]">
              {mode === "add" ? "إضافة طالب جديد" : "تعديل بيانات الطالب"}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="p-6 pt-3 space-y-4"
        >
          {/* Card Outer Container */}
          <div className="bg-[#f8fafc] border border-gray-100 p-5 rounded-2xl space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1e3a8a]" />
                اسم الطالب
              </label>
              <input
                type="text"
                value={form.fullName || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    fullName: e.target.value,
                  })
                }
                placeholder="أدخل اسم الطالب رباعي..."
                className={`w-full p-3 rounded-xl border bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition ${
                  errors.fullName
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#1e3a8a]"
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500 font-semibold">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Phones Section (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                  placeholder="01xxxxxxxxx"
                  className={`w-full p-3 rounded-xl border bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition ${
                    errors.phone
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-[#1e3a8a]"
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Parent Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  هاتف ولي الأمر
                </label>
                <input
                  type="text"
                  value={form.phoneParent || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phoneParent: e.target.value,
                    })
                  }
                  placeholder="01xxxxxxxxx"
                  className={`w-full p-3 rounded-xl border bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition ${
                    errors.phoneParent
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-200 focus:border-[#1e3a8a]"
                  }`}
                />
                {errors.phoneParent && (
                  <p className="mt-1 text-xs text-red-500 font-semibold">
                    {errors.phoneParent}
                  </p>
                )}
              </div>
            </div>

            {/* Group Field */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                المجموعة
              </label>
              <select
                value={form.groupId || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    groupId: e.target.value,
                  })
                }
                className={`w-full p-3 rounded-xl border bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 transition ${
                  errors.groupId
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-[#1e3a8a]"
                }`}
              >
                <option value="">-- اختر المجموعة --</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.groupId && (
                <p className="mt-1 text-xs text-red-500 font-semibold">
                  {errors.groupId}
                </p>
              )}
            </div>

            {/* Subscription Type */}
            <div className="p-3 bg-white rounded-xl border border-gray-200/80 space-y-2">
              <label className="block text-xs font-bold text-gray-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                نوع الاشتراك
              </label>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700">
                  <input
                    type="radio"
                    name="subscriptionType"
                    value={1}
                    checked={Number(form.subscriptionType) === 1}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subscriptionType: Number(e.target.value),
                      })
                    }
                    className="h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <span>بالحصة </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-gray-700">
                  <input
                    type="radio"
                    name="subscriptionType"
                    value={2}
                    checked={Number(form.subscriptionType) === 2}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        subscriptionType: Number(e.target.value),
                      })
                    }
                    className="h-4 w-4 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                  />
                  <span>شهري </span>
                </label>
              </div>

              {errors.subscriptionType && (
                <p className="mt-1 text-xs text-red-500 font-semibold">
                  {errors.subscriptionType}
                </p>
              )}
            </div>
            {/* Custom Price / Discount */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">
                سعر مخصص للطالب (اختياري — للخصومات)
              </label>
              <input
                type="number"
                min="0"
                value={form.customMonthlyPrice || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    customMonthlyPrice: e.target.value,
                  })
                }
                placeholder="اتركه فارغًا لاستخدام سعر المجموعة الافتراضي"
                className="w-full p-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                استخدمه لو الطالب عنده خصم أو اتفاق خاص (زي الإخوة أو الحالات
                الصعبة)
              </p>
            </div>
            {/* Footer Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-[#f1f5f9] text-gray-600 font-bold hover:bg-gray-200 transition-colors text-sm"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={onSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold transition-colors disabled:opacity-50 text-sm shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    <span>
                      {mode === "add" ? "جاري الإضافة..." : "جاري الحفظ..."}
                    </span>
                  </>
                ) : mode === "add" ? (
                  "إضافة الطالب"
                ) : (
                  "حفظ التعديلات"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
