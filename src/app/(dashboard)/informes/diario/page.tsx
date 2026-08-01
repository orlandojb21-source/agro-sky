import { PageHeader } from "@/components/ui/PageHeader";

export default function InformeDiarioPage() {
  return (
    <div>
      <PageHeader
        title="Informe Diario"
        description="Informe que arma el administrador a partir de los Informes de Campo del día."
      />
      <div className="rounded-xl border border-green-100 bg-white p-6 text-center text-sm text-green-700/70 shadow-sm dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
        Próximamente.
      </div>
    </div>
  );
}
