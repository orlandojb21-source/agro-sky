import { requireSection } from "@/lib/session";
import { UsuarioForm } from "@/components/forms/UsuarioForm";

export default async function NuevoUsuarioPage() {
  await requireSection("usuarios");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Nuevo usuario
      </h1>
      <UsuarioForm />
    </div>
  );
}
