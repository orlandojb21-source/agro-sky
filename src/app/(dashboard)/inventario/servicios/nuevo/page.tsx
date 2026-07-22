import { requireSection } from "@/lib/session";
import { ServicioForm } from "@/components/forms/ServicioForm";

export default async function NuevoServicioPage() {
  await requireSection("inventario");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo servicio
      </h1>
      <ServicioForm />
    </div>
  );
}
