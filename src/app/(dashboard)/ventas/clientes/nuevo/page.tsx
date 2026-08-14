import { requireWrite } from "@/lib/session";
import { ClienteForm } from "@/components/forms/ClienteForm";

export default async function NuevoClientePage() {
  await requireWrite("ventas");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo cliente
      </h1>
      <ClienteForm />
    </div>
  );
}
