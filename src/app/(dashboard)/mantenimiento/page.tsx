import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function MantenimientoPage() {
  await requireSection("mantenimiento");

  return (
    <div>
      <PageHeader title="Mantenimiento" />
      <EnConstruccion />
    </div>
  );
}
