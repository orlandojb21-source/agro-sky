import { BitacoraSubNav } from "@/components/layout/BitacoraSubNav";

// Envoltorio para Drones + Registro de Vuelo: 2 áreas separadas (pedido
// explícito del usuario, 2026-08-11) con su propia pestaña cada una --
// mismo patrón que GastosOperativosSubNav para Caja Menuda + Gastos.
export default function BitacoraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <BitacoraSubNav />
      {children}
    </div>
  );
}
