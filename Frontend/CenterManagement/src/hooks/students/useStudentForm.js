import { useState } from "react";
import toast from "react-hot-toast";
import { studentsService } from "../../services/studentService";

import { PHONE_REGEX } from "../../utils/students/studentValidation";

const EMPTY_FORM = {
  fullName: "",
  phone: "",
  phoneParent: "",
  groupId: "",
  subscriptionType: 2,
  customMonthlyPrice: "",
};

export function useStudentForm({ groups, page, setStudents, loadStudents }) {
  const [isOpen, setIsOpen] = useState(false);
  const [addOrEdit, setAddOrEdit] = useState(true); // true = add, false = edit
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loadingBtn, setLoadingBtn] = useState(false);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSelectedStudent(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddOrEdit(true);
    setIsOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setForm({
      fullName: student.fullName || "",
      phone: student.phone || "",
      phoneParent: student.phoneParent || "",
      groupId: student.groupId || "",
      subscriptionType: student.subscriptionType ?? 2,
      customMonthlyPrice: student.customMonthlyPrice ?? "",
    });
    setErrors({});
    setAddOrEdit(false);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetForm();
  };

  const validate = () => {
    const newErrors = {};

    if (!form.fullName.trim()) newErrors.fullName = "اسم الطالب مطلوب";

    if (!form.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    else if (!PHONE_REGEX.test(form.phone))
      newErrors.phone = "رقم الهاتف غير صحيح";

    if (!form.phoneParent.trim()) newErrors.phoneParent = "رقم ولي الأمر مطلوب";
    else if (!PHONE_REGEX.test(form.phoneParent))
      newErrors.phoneParent = "رقم ولي الأمر غير صحيح";

    if (!form.groupId) newErrors.groupId = "اختر المجموعة";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      subscriptionType: Number(form.subscriptionType),
      customMonthlyPrice:
        form.customMonthlyPrice === "" || form.customMonthlyPrice === null
          ? null
          : Number(form.customMonthlyPrice),
    };

    try {
      setLoadingBtn(true);

      if (addOrEdit) {
        const response = await studentsService.create(payload);
        toast.success("تم إضافة الطالب بنجاح");
        await loadStudents(page);
        closeModal();
        return { account: response?.data?.account ?? null };
      } else {
        console.log("Updating student with payload:", payload);
        await studentsService.update({ id: selectedStudent.id, ...payload });

        // Optimistically reflect the edit in the current page while the
        setStudents((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === selectedStudent.id
                ? {
                    ...item,
                    ...payload,
                    groupName:
                      groups.find((g) => g.id === payload.groupId)?.name ||
                      item.groupName,
                  }
                : item,
            ),
          };
        });
        toast.success("تم تعديل بيانات الطالب بنجاح");
      }

      await loadStudents(page);
      closeModal();
    }  catch (err) {
  console.error("UPDATE STUDENT ERROR:", err);
  console.error("STATUS:", err?.response?.status);
  console.error("RESPONSE DATA:", err?.response?.data);

  toast.error(
    err?.response?.data?.message ||
      err?.response?.data?.Message ||
      "فشل تعديل الطالب"
  );
}finally {
      setLoadingBtn(false);
    }
  };

  return {
    isOpen,
    addOrEdit,
    selectedStudent,
    form,
    setForm,
    errors,
    loadingBtn,
    openAddModal,
    openEditModal,
    closeModal,
    submit,
  };
}
