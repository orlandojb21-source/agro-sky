"use client";

export function DeleteButton({
  action,
  label = "Eliminar",
  confirmMessage = "¿Eliminar este registro? Esta acción no se puede deshacer.",
  className = "text-sm text-red-600 hover:underline dark:text-red-400",
}: {
  action: (formData: FormData) => Promise<void>;
  label?: string;
  confirmMessage?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
