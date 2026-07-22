import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function PlanillaPage() {
  await requireSection("planilla");

  return (
    <div>
      <PageHeader title="Planilla" />
      <EnConstruccion />
    </div>
  );
}
