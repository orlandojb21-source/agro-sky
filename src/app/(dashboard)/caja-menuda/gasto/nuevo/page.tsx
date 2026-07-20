import { requireSection } from "@/lib/session";
import { GastoForm } from "@/components/forms/GastoForm";

export default async function NuevoGastoPage() {
  await requireSection("caja-menuda");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Registrar gasto
      </h1>
      <GastoForm />
    </div>
  );
}
