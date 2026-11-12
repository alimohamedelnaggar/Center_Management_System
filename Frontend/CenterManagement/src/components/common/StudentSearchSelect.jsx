import Select from "react-select";

/**
 * Student picker used by the payment dialog.
 *
 * The react-select theme is bridged onto the identity-B CSS variables so the
 * control follows light/dark mode and the per-center brand colour instead of
 * the old hard-coded navy/white palette.
 */
const T = {
  card: "var(--color-card-val)",
  muted: "var(--color-muted-val)",
  border: "var(--color-border-val)",
  primary: "var(--color-primary-val)",
  text: "var(--color-text-main-val)",
  textMuted: "var(--color-text-muted-val)",
};

export default function StudentSearchSelect({
  students = [],
  value,
  onChange,
  disabled = false,
  placeholder = "-- ابحث باسم الطالب --",
}) {
  const options = Array.isArray(students)
    ? students.map((student) => {
        const id = student.studentId || student.id;
        const name =
          student.studentName || student.fullName || student.name || "بدون اسم";
        return { value: id, label: name };
      })
    : [];

  const selectedOption = options.find((opt) => opt.value === value) || null;

  const handleChange = (selected) => {
    const selectedValue = selected ? selected.value : "";
    onChange({
      target: {
        name: "studentId",
        value: selectedValue,
      },
    });
  };

  return (
    <div className="min-w-0">
      <label
        htmlFor="payment-student"
        className="mb-1.5 block text-sm font-medium text-text-main"
      >
        الطالب
      </label>

      <Select
        inputId="payment-student"
        options={options}
        value={selectedOption}
        onChange={handleChange}
        isDisabled={disabled}
        isSearchable={true}
        isClearable={true}
        placeholder={placeholder}
        noOptionsMessage={() => "لا يوجد طلاب"}
        className="text-sm dir-rtl"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: "2.75rem",
            padding: "2px 4px",
            borderRadius: "0.75rem",
            borderColor: state.isFocused ? T.primary : T.border,
            boxShadow: state.isFocused
              ? `0 0 0 3px color-mix(in srgb, ${T.primary} 22%, transparent)`
              : "none",
            "&:hover": {
              borderColor: T.primary,
            },
            backgroundColor: state.isDisabled ? T.muted : T.card,
            color: T.text,
          }),
          singleValue: (base) => ({
            ...base,
            color: T.text,
            // Let a long Arabic name wrap instead of clipping at 200% text
            // zoom; the control grows in height to keep the value readable.
            whiteSpace: "normal",
            overflow: "visible",
            textOverflow: "clip",
          }),
          input: (base) => ({
            ...base,
            color: T.text,
            // The text cursor is the real focus target inside the control;
            // keep it a full-size touch target instead of a 2px sliver.
            minHeight: "2.75rem",
            minWidth: "2.75rem",
          }),
          placeholder: (base) => ({ ...base, color: T.textMuted }),
          menu: (base) => ({
            ...base,
            borderRadius: "0.75rem",
            border: `1px solid ${T.border}`,
            overflow: "hidden",
            backgroundColor: T.card,
            zIndex: 50,
          }),
          menuList: (base) => ({ ...base, maxHeight: "16rem" }),
          option: (base, state) => ({
            ...base,
            fontSize: "0.875rem",
            backgroundColor: state.isFocused ? T.muted : T.card,
            color: T.text,
            cursor: "pointer",
          }),
          noOptionsMessage: (base) => ({ ...base, color: T.textMuted }),
          clearIndicator: (base) => ({
            ...base,
            color: T.textMuted,
            "&:hover": { color: T.text },
          }),
          dropdownIndicator: (base) => ({
            ...base,
            color: T.textMuted,
            "&:hover": { color: T.text },
          }),
          indicatorSeparator: (base) => ({ ...base, backgroundColor: T.border }),
        }}
        theme={(theme) => ({
          ...theme,
          colors: {
            ...theme.colors,
            primary: T.primary,
            primary25: T.muted,
            primary50: T.muted,
            neutral0: T.card,
            neutral5: T.muted,
            neutral10: T.muted,
            neutral20: T.border,
            neutral80: T.text,
          },
        })}
      />
    </div>
  );
}
