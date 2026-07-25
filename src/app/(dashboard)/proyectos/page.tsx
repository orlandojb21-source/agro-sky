import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function ProyectosPage() {
  await requireSection("proyectos");

  return (
    <div>
      <PageHeader title="Proyectos" />
      <EnConstruccion />
    </div>
  );
}
