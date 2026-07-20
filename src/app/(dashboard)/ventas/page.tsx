import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function VentasPage() {
  await requireSection("ventas");

  return (
    <div>
      <PageHeader title="Ventas" />
      <EnConstruccion />
    </div>
  );
}
