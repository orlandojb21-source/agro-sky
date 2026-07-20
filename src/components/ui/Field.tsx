export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
  min,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
  min?: string | number;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
        placeholder={placeholder}
        className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  children,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      >
        {children}
      </select>
    </label>
  );
}
