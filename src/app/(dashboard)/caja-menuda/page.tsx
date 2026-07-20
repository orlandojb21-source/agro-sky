import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function CajaMenudaPage() {
  await requireSection("caja-menuda");

  return (
    <div>
      <PageHeader title="Caja Menuda" />
      <EnConstruccion />
    </div>
  );
}
