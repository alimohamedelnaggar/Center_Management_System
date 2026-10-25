import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, FileText, Pencil, Plus, Printer, Search, Trash2 } from "@/components/icons";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import Pagination from "../../components/common/Pagination";
import { groupsService } from "../../services/groupsService";
import { questionBankService } from "../../services/questionBankService";
import { questionExamService } from "../../services/questionExamService";
import QuestionExamModal from "./QuestionExamModal";
import QuestionExamResultsModal from "./QuestionExamResultsModal";

export default function ExamsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [exams, setExams] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [mode, setMode] = useState("");
  const [isPublished, setIsPublished] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [resultsExam, setResultsExam] = useState(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  const loadLookups = async () => {
    try {
      const [groupsRes, yearsRes] = await Promise.all([
        groupsService.getAllGroups(),
        questionBankService.getAcademicYears(),
      ]);

      if (groupsRes?.succeeded) setGroups(groupsRes.data ?? []);
      if (yearsRes?.succeeded) setAcademicYears(yearsRes.data ?? []);
    } catch (error) {
      console.error("فشل في تحميل البيانات الأساسية", error);
    }
  };

  const loadExams = async (page = 1) => {
    try {
      setLoading(true);

      const response = await questionExamService.getPaged({
        pageNumber: page,
        pageSize,
        search: search.trim(),
        groupId,
        academicYearId,
        mode,
        isPublished,
        from,
        to,
      });

      if (response?.succeeded) {
        setExams(response.data.data ?? []);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
        setTotalItems(response.data.totalCount);
      } else {
        toast.error(response?.message ?? "فشل في تحميل الامتحانات");
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل في تحميل الامتحانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadExams(1);
  }, [groupId, academicYearId, mode, isPublished, from, to, search]);

  useEffect(() => {
    loadExams(currentPage);
  }, [currentPage]);

  const openAddExam = () => {
    setEditingExam(null);
    setShowModal(true);
  };

  const openEditExam = (exam) => {
    setEditingExam(exam);
    setShowModal(true);
  };

  const handleSaveExam = async (data) => {
    try {
      const response = editingExam
        ? await questionExamService.update(data)
        : await questionExamService.create(data);

      if (response?.succeeded) {
        toast.success(
          response.message ??
            (editingExam ? "تم تعديل الامتحان بنجاح" : "تم إنشاء الامتحان بنجاح"),
        );
        setShowModal(false);
        loadExams(currentPage);
      } else {
        toast.error(response?.message ?? "حدث خطأ ما");
      }
    } catch (error) {
      console.error("فشل في حفظ الامتحان", error);
      toast.error("حدث خطأ ما");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExam) return;

    try {
      setDeleting(true);
      const response = await questionExamService.delete(selectedExam.id);

      if (response?.succeeded) {
        toast.success(response.message ?? "تم حذف الامتحان بنجاح");
        if (currentPage > 1 && exams.length === 1) {
          setCurrentPage(currentPage - 1);
        } else {
          loadExams(currentPage);
        }
      } else {
        toast.error(response?.message ?? "فشل في حذف الامتحان");
      }

      setIsDeleteOpen(false);
      setSelectedExam(null);
    } catch (error) {
      console.error("فشل في حذف الامتحان", error);
      toast.error("فشل في حذف الامتحان");
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-subtle";

  const handlePublishedChange = (examId, published) => {
    setExams((prev) =>
      prev.map((exam) =>
        exam.id === examId
          ? { ...exam, isResultsPublished: published }
          : exam,
      ),
    );
    setResultsExam((prev) =>
      prev && prev.id === examId
        ? { ...prev, isResultsPublished: published }
        : prev,
    );
  };

  return (
    <div className="p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-main">الامتحانات</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            أنشئ امتحانات ورقية أو إلكترونية واختر أسئلتها من بنك الأسئلة
          </p>
        </div>
        <button
          type="button"
          onClick={openAddExam}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" />
          إنشاء امتحان
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الامتحان..."
            className={`${inputClass} pr-10`}
          />
        </div>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className={inputClass}
        >
          <option value="">كل المجموعات</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        <select
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          className={inputClass}
        >
          <option value="">كل السنوات الدراسية</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className={inputClass}
        >
          <option value="">كل الأنواع</option>
          <option value="1">ورقي</option>
          <option value="2">إلكتروني</option>
        </select>
        <select
          value={isPublished}
          onChange={(e) => setIsPublished(e.target.value)}
          className={inputClass}
        >
          <option value="">كل حالات النشر</option>
          <option value="true">النتائج منشورة</option>
          <option value="false">النتائج غير منشورة</option>
        </select>
        <div className="sm:col-span-2 xl:col-span-4 2xl:col-span-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium text-text-muted">
              من تاريخ
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={`${inputClass} w-auto`}
            />
            <label className="text-xs font-medium text-text-muted">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={`${inputClass} w-auto`}
            />
            {(from || to) && (
              <button
                type="button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-surface-muted"
              >
                مسح التواريخ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exams card */}
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted text-xs font-semibold text-text-muted">
                <th className="w-12 px-4 py-3">#</th>
                <th className="px-4 py-3">اسم الامتحان</th>
                <th className="px-4 py-3">المجموعة</th>
                <th className="px-4 py-3">السنة</th>
                <th className="px-4 py-3">النوع</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">الأسئلة</th>
                <th className="px-4 py-3">الدرجة</th>
                <th className="px-4 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                exams.map((exam, idx) => (
                  <tr
                    key={exam.id}
                    className="border-b border-surface-border last:border-0 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-text-main">
                        <FileText className="h-4 w-4 text-text-muted" />
                        {exam.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {exam.groupName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary">
                        {exam.academicYearName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          exam.mode === 2
                            ? "bg-status-info-bg text-status-info"
                            : "bg-status-warning-bg text-status-warning"
                        }`}
                      >
                        {exam.modeName}
                      </span>
                      {exam.mode === 2 && (
                        <span
                          className={`mt-1 block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            exam.isResultsPublished
                              ? "bg-status-success-bg text-status-success"
                              : "bg-surface-muted text-text-muted"
                          }`}
                        >
                          {exam.isResultsPublished
                            ? "النتائج منشورة"
                            : "بانتظار النشر"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {new Date(exam.examDate).toLocaleDateString("ar-EG")}
                      {exam.mode === 2 && (
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {new Date(exam.examDate).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {exam.durationMinutes
                            ? ` — ${exam.durationMinutes} دقيقة`
                            : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {exam.questionsCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-main">
                      {exam.totalMarks}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {exam.mode === 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setResultsExam(exam);
                              setIsResultsOpen(true);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-accent transition-colors hover:bg-accent hover:text-text-inverse"
                            title="النتائج"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/exams/${exam.id}/paper`)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-info-bg text-status-info transition-colors hover:bg-status-info hover:text-text-inverse"
                          title="طباعة الامتحان"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditExam(exam)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors hover:bg-primary hover:text-text-inverse"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExam(exam);
                            setIsDeleteOpen(true);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-status-danger-bg text-status-danger transition-colors hover:bg-status-danger hover:text-text-inverse"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && exams.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-text-muted" />
                      <p className="text-sm text-text-muted">
                        لا توجد امتحانات بعد، اضغط "إنشاء امتحان".
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-text-muted">
                    جاري التحميل...
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            name="امتحان"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <QuestionExamModal
        open={showModal}
        exam={editingExam}
        groups={groups}
        academicYears={academicYears}
        onClose={() => setShowModal(false)}
        onSave={handleSaveExam}
      />

      <QuestionExamResultsModal
        open={isResultsOpen}
        exam={resultsExam}
        onPublishedChange={handlePublishedChange}
        onClose={() => {
          setIsResultsOpen(false);
          setResultsExam(null);
        }}
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedExam(null);
        }}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="حذف الامتحان"
        message={`هل أنت متأكد من حذف الامتحان "${selectedExam?.name ?? ""}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </div>
  );
}
