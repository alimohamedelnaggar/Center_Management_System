import { X, User, Phone, Users, ShieldCheck, CheckCircle2, XCircle } from "@/components/icons";

export default function ViewStudentModal({ open, onClose, student }) {
  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 dir-rtl text-right">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transition-all duration-200">
        
        <div className="p-6 pb-2 flex justify-between items-center">
        
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-[#1e3a8a]" />
            <h2 className="text-xl font-bold text-[#1e3a8a]">بيانات الطالب</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-6 pt-3 space-y-4">
          
          {/* Card Wrapper matching Add forms */}
          <div className="bg-[#f8fafc] border border-gray-100 p-5 rounded-2xl space-y-3">
            
            <InfoRow 
              icon={<User className="w-4 h-4 text-[#1e3a8a]" />} 
              title="الاسم" 
              value={student.fullName} 
              isBold
            />

            <InfoRow 
              icon={<Phone className="w-4 h-4 text-gray-400" />} 
              title="رقم الهاتف" 
              value={student.phone || "غير محدد"} 
            />

            <InfoRow 
              icon={<Phone className="w-4 h-4 text-gray-400" />} 
              title="هاتف ولي الأمر" 
              value={student.phoneParent || "غير محدد"} 
            />

            <InfoRow 
              icon={<Users className="w-4 h-4 text-gray-400" />} 
              title="المجموعة" 
              value={student.groupName || "غير مسجل بمجموعة"} 
            />

            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-500">حالة الطالب</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                student.isActive 
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}>
                {student.isActive ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    نشط
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    غير نشط
                  </>
                )}
              </span>
            </div>

            {/* Action inside section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-bold transition-colors text-sm shadow-sm"
              >
                إغلاق
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, title, value, isBold = false }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200/80">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-bold text-gray-500">{title}</span>
      </div>
      <span className={`text-sm text-gray-800 ${isBold ? "font-bold text-[#1e3a8a]" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}