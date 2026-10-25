import { useState } from "react";

export default function useFormHandler({
  validate,
  onSubmit,
}) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (form, event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    const validationErrors = validate(form);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    setErrors({});

    try {
      setLoading(true);

      await onSubmit(form);

      return true;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    errors,
    setErrors,
    handleSubmit,
  };
}