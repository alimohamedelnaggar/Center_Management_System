
import Select from "react-select";

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
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5">
        الطالب
      </label>
      <Select
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
            padding: "2px 4px",
            borderRadius: "0.75rem", // rounded-xl
            borderColor: state.isFocused ? "#1e3a8a" : "#e5e7eb",
            boxShadow: state.isFocused
              ? "0 0 0 2px rgba(30, 58, 138, 0.2)"
              : "none",
            "&:hover": {
              borderColor: "#1e3a8a",
            },
            backgroundColor: state.isDisabled ? "#f3f4f6" : "white",
          }),
          menu: (base) => ({
            ...base,
            borderRadius: "0.75rem",
            zIndex: 50,
          }),
        }}
      />
    </div>
  );
}