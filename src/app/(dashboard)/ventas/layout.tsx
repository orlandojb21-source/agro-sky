import { VentasSubNav } from "@/components/layout/VentasSubNav";

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <VentasSubNav />
      {children}
    </div>
  );
}
