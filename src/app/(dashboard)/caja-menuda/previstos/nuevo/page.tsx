import { requireSection } from "@/lib/session";
import { PrevistoForm } from "@/components/forms/PrevistoForm";

export default async function NuevoPrevistoPage() {
  await requireSection("caja-menuda");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Asignar previsto
      </h1>
      <PrevistoForm />
    </div>
  );
}
