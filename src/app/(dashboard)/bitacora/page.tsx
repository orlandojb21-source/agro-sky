import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function BitacoraPage() {
  await requireSection("bitacora");

  return (
    <div>
      <PageHeader title="Bitácora" />
      <EnConstruccion />
    </div>
  );
}
