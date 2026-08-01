import { requireSection } from "@/lib/session";
import { InformesSubNav } from "@/components/layout/InformesSubNav";

export default async function InformesLayout({ children }: { children: React.ReactNode }) {
  await requireSection("informes");

  return (
    <div className="flex flex-col gap-6">
      <InformesSubNav />
      {children}
    </div>
  );
}
