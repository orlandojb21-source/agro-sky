import { requireSection } from "@/lib/session";
import { PlanillaSubNav } from "@/components/layout/PlanillaSubNav";

export default async function PlanillaLayout({ children }: { children: React.ReactNode }) {
  await requireSection("planilla");

  return (
    <div className="flex flex-col gap-6">
      <PlanillaSubNav />
      {children}
    </div>
  );
}
