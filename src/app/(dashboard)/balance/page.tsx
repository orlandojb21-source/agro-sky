import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

export default async function BalancePage() {
  await requireSection("balance");

  return (
    <div>
      <PageHeader title="Balance" />
      <EnConstruccion />
    </div>
  );
}
