import { PasswordInput } from "./PasswordInput";

const CLASE_INPUT =
  "rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  value,
  required,
  step,
  min,
  placeholder,
  onChange,
  list,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  // Si se pasa `value`, el input queda controlado (ignora defaultValue) --
  // usado cuando otro campo del mismo formulario necesita recalcular este
  // valor en vivo (ej. una deducción calculada a partir de un monto que se
  // sigue editando). Si no se pasa, el input sigue siendo no controlado
  // como siempre.
  value?: string;
  required?: boolean;
  step?: string;
  min?: string | number;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Id de un <datalist> para sugerir valores ya guardados (ej. clientes
  // existentes), sin dejar de aceptar texto libre.
  list?: string;
}) {
  const valorControlado = value !== undefined ? { value } : { defaultValue };
  return (
    <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
      {label}
      {type === "password" ? (
        <PasswordInput
          name={name}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          className={CLASE_INPUT}
        />
      ) : (
        <input
          name={name}
          type={type}
          {...valorControlado}
          required={required}
          step={step}
          min={min}
          placeholder={placeholder}
          onChange={onChange}
          list={list}
          className={CLASE_INPUT}
        />
      )}
    </label>
  );
}

export function SelectField({
  label,
  name,
  children,
  defaultValue,
  value,
  required,
  onChange,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  defaultValue?: string;
  // Si se pasa `value`, el select queda controlado (ignora defaultValue) --
  // mismo motivo que en Field: usado cuando otro campo del mismo
  // formulario necesita recalcular esta selección en vivo (ej. el
  // colaborador que se autollena al elegir un Informe de Campo). Si no se
  // pasa, el select sigue siendo no controlado como siempre.
  value?: string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const valorControlado = value !== undefined ? { value } : { defaultValue };
  return (
    <label className="flex flex-col gap-1 text-sm text-green-900 dark:text-green-100">
      {label}
      <select
        name={name}
        {...valorControlado}
        required={required}
        onChange={onChange}
        className="rounded-lg border border-green-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600 dark:border-green-800 dark:bg-green-950/30"
      >
        {children}
      </select>
    </label>
  );
}
