

export const FormInput = ({ label, error, registration, ...inputProps }) => {
  return (
    <div className="flex flex-col gap-1 mb-4">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        {...registration}
        {...inputProps}
        className={`px-3 py-2 border rounded-md outline-none transition-all ${
          error
            ? 'border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-gray-300 focus:ring-1 focus:ring-blue-500'
        }`}
      />
      {error && (
        <span className="text-xs text-red-600 font-semibold mt-0.5">
          {error.message}
        </span>
      )}
    </div>
  );
};