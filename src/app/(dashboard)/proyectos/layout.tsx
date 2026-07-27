import { requireSection } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EnConstruccion } from "@/components/ui/EnConstruccion";

// Oculta temporalmente TODO lo que hay bajo /proyectos (lista, nuevo
// informe, detalle) detras de "En Construccion" -- pedido explicito del
// usuario, sin borrar ni modificar el modulo real (page.tsx, formularios,
// acciones, migraciones siguen intactos). Al no renderizar "children", ninguna
// de esas paginas llega a ejecutarse aunque alguien entre directo a una URL
// como /proyectos/nuevo. Para reactivarlo mas adelante, alcanza con borrar
// este archivo.
export default async function ProyectosLayout() {
  await requireSection("proyectos");

  return (
    <div>
      <PageHeader title="Proyectos" />
      <EnConstruccion />
    </div>
  );
}
