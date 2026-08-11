import { GastosOperativosSubNav } from "@/components/layout/GastosOperativosSubNav";

// Envoltorio delgado, solo las pestañas Caja Menuda / Gastos -- el resumen
// de saldo de caja (solo relevante para la pestaña Caja Menuda) vive en su
// propio layout, en el grupo de rutas (caja) de al lado, para no mostrarlo
// también en Gastos.
export default function GastosOperativosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <GastosOperativosSubNav />
      {children}
    </div>
  );
}
