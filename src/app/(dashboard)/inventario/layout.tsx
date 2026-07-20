import { InventarioSubNav } from "@/components/layout/InventarioSubNav";

export default function InventarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <InventarioSubNav />
      {children}
    </div>
  );
}
