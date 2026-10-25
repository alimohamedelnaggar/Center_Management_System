import { useState } from "react";
import toast from "react-hot-toast";
import { studentsService } from "../../services/studentService";


export function useStudentActions({ page, loadStudents }) {
  const [viewOpen, setViewOpen] = useState(false);

  // Delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // changeStatus
  const [confirmChangeStatusOpen, setConfirmChangeStatusOpen] = useState(false);
  const [changeStatusLoading, setChangeStatusLoading] = useState(false);

  // Payment
  const [confirmPaymentStatusOpen, setConfirmPaymentStatusOpen] =
    useState(false);
  const [changePaymentStatusLoading, setChangePaymentStatusLoading] =
    useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  // =========================
  // View student
  // =========================
  const openView = (student) => {
    setSelectedStudent(student);
    setViewOpen(true);
  };

  // =========================
  // Delete student
  // =========================
  const openConfirmDeleteToggle = (student) => {
    setSelectedStudent(student);
    setConfirmOpen(true);
  };

  const closeConfirmDeleteToggle = () => {
    if (deleteLoading) return;

    setConfirmOpen(false);
    setSelectedStudent(null);
  };

  const confirmDeleteToggle = async () => {
    if (!selectedStudent) return;

    try {
      setDeleteLoading(true);


      const result = await studentsService.delete(selectedStudent.id);

      toast.success(result.message || "تم حذف الطالب");

      await loadStudents(page);

      setConfirmOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      toast.error("فشل حذف الطالب");
    } finally {
      setDeleteLoading(false);
    }
  };

  
  // =========================
  // changeStatus student
  // =========================
  const openConfirmChangeStatusToggle = (student) => {
    setSelectedStudent(student);
    setConfirmChangeStatusOpen(true);
  };

  const closeConfirmChangeStatusToggle = () => {
    if (changeStatusLoading) return;

    setConfirmChangeStatusOpen(false);
    setSelectedStudent(null);
  };

  const confirmChangeStatusToggle = async () => {
    if (!selectedStudent) return;

    try {
      setChangeStatusLoading(true);

      const result = await studentsService.toggleStatus(selectedStudent.id);
      toast.success(result.message || "تم تغيير حالة الطالب");

      await loadStudents(page);

      setConfirmChangeStatusOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      toast.error("فشل تغيير حالة الطالب الطالب");
    } finally {
      setChangeStatusLoading(false);
    }
  };

  // =========================
  // Change Payment Status
  // =========================
  const openConfirmToggle = (student) => {
    setSelectedStudent(student);
    setConfirmPaymentStatusOpen(true);
  };

  const closeConfirmToggle = () => {
    if (changePaymentStatusLoading) return;

    setConfirmPaymentStatusOpen(false);
    setSelectedStudent(null);
  };

  const confirmToggle = async () => {
    if (!selectedStudent) return;

    try {

      setChangePaymentStatusLoading(true);

      const result = await studentsService.togglePaymentStatus(
        selectedStudent.id,
      );

      toast.success(result.message || "تم تغيير حالة دفع الطالب");

      await loadStudents(page);

      setConfirmPaymentStatusOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      toast.error("فشل تغيير حالة الدفع");
    } finally {
      setChangePaymentStatusLoading(false);
    }
  };

  return {

    selectedStudent,
    setViewOpen,

    // View
    viewOpen,
    openView,

    // Delete
    confirmOpen,
    deleteLoading,
    openConfirmDeleteToggle,
    closeConfirmDeleteToggle,
    confirmDeleteToggle,

    // ChangeStatus
    confirmChangeStatusOpen,
    changeStatusLoading,
    openConfirmChangeStatusToggle,
    closeConfirmChangeStatusToggle,
    confirmChangeStatusToggle,

    // Payment
    confirmPaymentStatusOpen,
    changePaymentStatusLoading,
    openConfirmToggle,
    closeConfirmToggle,
    confirmToggle,
  };
}
