import { requireSection } from "@/lib/session";
import { esSoporteOJefe } from "@/lib/roles";
import { PlanillaSubNav } from "@/components/layout/PlanillaSubNav";

export default async function PlanillaLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requireSection("planilla");

  return (
    <div className="flex flex-col gap-6">
      {/* El administrador solo administra Asistencia -- no hay nada a lo
          que cambiar de pestaña, así que no se muestra el subnav. */}
      {esSoporteOJefe(perfil.rol) && <PlanillaSubNav />}
      {children}
    </div>
  );
}
