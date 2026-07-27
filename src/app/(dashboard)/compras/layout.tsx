import { ComprasSubNav } from "@/components/layout/ComprasSubNav";

export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <ComprasSubNav />
      {children}
    </div>
  );
}
