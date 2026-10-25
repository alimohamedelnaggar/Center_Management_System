
import { FileQuestion, HelpCircle } from "@/components/icons"

export default function NotFound() {
 
  return (
    <div
      className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 text-center dir-rtl"
      dir="rtl"
    >
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 transition-all">
        {/* Icon & 404 Visual */}
        <div className="relative flex justify-center items-center mb-6">
          <span className="text-8xl font-black text-[#1e3a8a]/10 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-[#1e3a8a]/10 rounded-2xl text-[#1e3a8a]">
              <FileQuestion className="w-12 h-12 stroke-[1.5]" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          الصفحة غير موجودة!
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          عذراً، الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقله إلى مكان آخر
          داخل النظام.
        </p>

       
       <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>إذا كنت تعتقد أن هذا خطأ، يرجى مراجعة المسؤول.</span>
        </div>
      </div>
    </div>
  )
}