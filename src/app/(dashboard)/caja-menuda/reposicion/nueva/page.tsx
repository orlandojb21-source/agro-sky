import { requireSection } from "@/lib/session";
import { ReposicionForm } from "@/components/forms/ReposicionForm";

export default async function NuevaReposicionPage() {
  await requireSection("caja-menuda");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-green-900 dark:text-green-50">
        Reponer caja
      </h1>
      <ReposicionForm />
    </div>
  );
}
