import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Edit2,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "@/components/icons";

import Pagination from "../components/common/Pagination";
import ConfirmModal from "../components/common/ConfirmModal";
import TeacherModal from "../components/common/TeacherModal";
import Spinner from "../components/common/Spinner";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { fieldBaseClass } from "../components/ui/Input";
import { teacherService } from "../services/teacherService";

const PAGE_SIZE = 8;

function SubjectBadge({ subject }) {
  if (subject) {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full bg-primary-subtle px-2.5 text-xs font-bold text-primary">
        {subject}
      </span>
    );
  }

  return (
    <span className="inline-flex min-h-6 items-center rounded-full bg-status-warning-bg px-2.5 text-xs font-bold text-status-warning">
      بدون مادة — اضغط تعديل
    </span>
  );
}

function GroupChips({ groups }) {
  if (!groups || groups.length === 0) {
    return <span className="text-sm text-text-muted">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((group) => (
        <span
          key={group.id}
          className="inline-flex min-h-6 items-center rounded-full border border-surface-border bg-surface-muted px-2.5 text-xs text-text-main"
        >
          {group.name}
        </span>
      ))}
    </div>
  );
}

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

  const rowNumber = (index) => (page - 1) * PAGE_SIZE + index + 1;

  return (
    <div
      data-testid="teachers-page"
      dir="rtl"
      className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6"
    >
      <PageHeader
        title="إدارة المدرسين"
        subtitle="بيانات المدرسين والمواد والمجموعات المرتبطة بكل مدرس."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            إضافة مدرس
          </Button>
        }
      />

      <section className="overflow-hidden rounded-card border border-surface-border bg-surface-card shadow-sm">
        <div className="border-b border-surface-border p-4">
          <div className="relative w-full max-w-sm">
            <Search
              className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="بحث عن مدرس"
              placeholder="بحث بالاسم أو الهاتف..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className={`${fieldBaseClass} ps-10 pe-3`}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10">
            <Spinner msg="جارٍ تحميل المدرسين..." />
          </div>
        ) : teachers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-text-muted">
            <Users size={40} aria-hidden="true" />
            <p>لا يوجد مدرسون بعد</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
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
                      <td className="p-4 text-text-muted">{rowNumber(index)}</td>
                      <td className="p-4 font-bold text-text-main">
                        {teacher.fullName}
                      </td>
                      <td className="p-4 text-text-muted" dir="ltr">
                        {teacher.phoneNumber || "-"}
                      </td>
                      <td className="p-4">
                        <SubjectBadge subject={teacher.subject} />
                      </td>
                      <td className="p-4">
                        <GroupChips groups={teacher.groups} />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEdit(teacher)}
                            aria-label={`تعديل ${teacher.fullName}`}
                            title="تعديل"
                          >
                            <Edit2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setIsDeleteOpen(true);
                            }}
                            aria-label={`حذف ${teacher.fullName}`}
                            title="حذف"
                            className="text-status-danger hover:bg-status-danger-bg"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-surface-border md:hidden">
              {teachers.map((teacher, index) => (
                <li key={teacher.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-text-muted">
                        #{rowNumber(index)}
                      </p>
                      <h3 className="truncate text-base font-bold text-text-main">
                        {teacher.fullName}
                      </h3>
                      <p
                        className="mt-1 flex items-center gap-1.5 text-sm text-text-muted"
                        dir="ltr"
                      >
                        <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                        {teacher.phoneNumber || "-"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(teacher)}
                        aria-label={`تعديل ${teacher.fullName}`}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTeacher(teacher);
                          setIsDeleteOpen(true);
                        }}
                        aria-label={`حذف ${teacher.fullName}`}
                        className="text-status-danger hover:bg-status-danger-bg"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SubjectBadge subject={teacher.subject} />
                    <GroupChips groups={teacher.groups} />
                  </div>
                </li>
              ))}
            </ul>
          </>
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
      </section>

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
