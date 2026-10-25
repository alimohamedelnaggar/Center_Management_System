export const PHONE_REGEX = /^01[0125][0-9]{8}$/;

export function validateStudent(form) {
  const errors = {};

  if (!form.fullName?.trim()) {
    errors.fullName = "اسم الطالب مطلوب";
  }

  if (!form.phone?.trim()) {
    errors.phone = "رقم الهاتف مطلوب";
  } else if (!PHONE_REGEX.test(form.phone)) {
    errors.phone = "رقم الهاتف غير صحيح";
  }

  if (!form.phoneParent?.trim()) {
    errors.phoneParent = "رقم ولي الأمر مطلوب";
  } else if (!PHONE_REGEX.test(form.phoneParent)) {
    errors.phoneParent = "رقم ولي الأمر غير صحيح";
  }

  if (!form.groupId) {
    errors.groupId = "اختر المجموعة";
  }

  return errors;
}

export function isStudentFormValid(form) {
  return Object.keys(validateStudent(form)).length === 0;
}