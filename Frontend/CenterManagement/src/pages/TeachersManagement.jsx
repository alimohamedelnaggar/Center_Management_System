import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Edit2, Trash2, Users } from "@/components/icons";

import Pagination from "../components/common/Pagination";
import ConfirmModal from "../components/common/ConfirmModal";
import TeacherModal from "../components/common/TeacherModal";
import Spinner from "../components/common/Spinner";
import { teacherService } from "../services/teacherService";

const PAGE_SIZE = 8;

export default function TeachersManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [page, search]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await teacherService.getPaginated(page, PAGE_SIZE, search);
      const dataList = res.data || res.data?.data || res.items || [];
      setTeachers(dataList);
      setTotalPages(res.totalPages || 1);
      setTotal(res.totalCount || dataList.length);
    } catch {
      toast.error("فشل في تحميل المدرسين");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedTeacher(null);
    setIsModalOpen(true);
  };

  const openEdit = (teacher) => {
    setSelectedTeacher(teacher);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      const response = formData.id
        ? await teacherService.edit(formData)
        : await teacherService.create(formData);

      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حفظ بيانات المدرس");
        return;
      }

      toast.success(formData.id ? "تم تحديث بيانات المدرس" : "تم إضافة المدرس");
      setIsModalOpen(false);
      fetchTeachers();
    } catch {
      toast.error("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await teacherService.delete(selectedTeacher.id);
      if (response?.succeeded === false) {
        toast.error(response?.message || "تعذر حذف المدرس");
        return;
      }
      toast.success("تم حذف المدرس");
      setIsDeleteOpen(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">إدارة المدرسين</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <Plus size={16} /> إضافة مدرس
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="w-full rounded-lg border border-surface-border bg-surface-card py-2 pe-3 ps-9 text-text-main focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-card shadow">
        {loading ? (
          <div className="p-10">
            <Spinner msg="جارٍ تحميل المدرسين..." />
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-text-muted">
            <Users size={40} />
            <p>لا يوجد مدرسون بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-surface-muted text-sm text-text-muted">
                <tr>
                  <th className="p-4 font-medium">#</th>
                  <th className="p-4 font-medium">الاسم</th>
                  <th className="p-4 font-medium">الهاتف</th>
                  <th className="p-4 font-medium">المادة</th>
                  <th className="p-4 font-medium">المجموعات</th>
                  <th className="p-4 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, index) => (
                  <tr
                    key={teacher.id}
                    className="border-t border-surface-border hover:bg-surface-muted/50"
                  >
                    <td className="p-4 text-text-muted">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="p-4 font-bold text-text-main">
                      {teacher.fullName}
                    </td>
                    <td className="p-4 text-text-muted" dir="ltr">
                      {teacher.phoneNumber || "-"}
                    </td>
                    <td className="p-4 text-text-main">
                      {teacher.subject ? (
                        teacher.subject
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-status-warning-bg px-2 py-0.5 text-xs font-bold text-status-warning">
                          بدون مادة — اضغط تعديل
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {teacher.groups && teacher.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.groups.map((group) => (
                            <span
                              key={group.id}
                              className="rounded-md border border-surface-border bg-surface-muted px-2 py-0.5 text-xs text-text-main"
                            >
                              {group.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(teacher)}
                          title="تعديل"
                          className="rounded-lg border border-surface-border p-2 text-text-muted hover:bg-surface-muted hover:text-primary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeacher(teacher);
                            setIsDeleteOpen(true);
                          }}
                          title="حذف"
                          className="rounded-lg border border-surface-border p-2 text-text-muted hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && teachers.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            name="مدرس"
            onPageChange={setPage}
          />
        )}
      </div>

      <TeacherModal
        isOpen={isModalOpen}
        initialData={selectedTeacher}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        loading={deleting}
        title="حذف المدرس"
        message="هل أنت متأكد من حذف هذا المدرس؟ لا يمكن التراجع عن هذا الإجراء."
        details={
          selectedTeacher
            ? [
                { label: "الاسم", value: selectedTeacher.fullName },
                { label: "الهاتف", value: selectedTeacher.phoneNumber || "-" },
              ]
            : null
        }
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedTeacher(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
