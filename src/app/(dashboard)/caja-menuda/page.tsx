import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function CajaMenudaPage() {
  await requireSection("caja-menuda");

  return (
    <div>
      <PageHeader title="Caja Menuda" />
      <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
        Esta sección se construye en la Fase 2.
      </p>
    </div>
  );
}
