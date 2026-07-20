import { requireSection } from "@/lib/session";
import { obtenerRacksConContenedores } from "@/lib/data/racks";
import { PageHeader } from "@/components/ui/PageHeader";
import { RackForm } from "@/components/forms/RackForm";
import { ContenedorForm } from "@/components/forms/ContenedorForm";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  eliminarRackAction,
  eliminarContenedorAction,
} from "@/lib/actions/racks";

export default async function RacksPage() {
  await requireSection("inventario");
  const racks = await obtenerRacksConContenedores();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Racks y contenedores"
        description="Ubicaciones físicas donde se guarda el inventario."
      />

      <RackForm />

      {racks.length === 0 ? (
        <p className="rounded-xl border border-green-100 bg-white px-6 py-10 text-center text-sm text-green-700/70 dark:border-green-900/40 dark:bg-green-950/10 dark:text-green-200/70">
          Todavía no hay racks. Crea el primero arriba.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {racks.map((rack) => (
            <div
              key={rack.id}
              className="rounded-xl border border-green-100 bg-white p-4 shadow-sm dark:border-green-900/40 dark:bg-green-950/10"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-green-900 dark:text-green-50">
                  {rack.nombre}
                </h2>
                <DeleteButton
                  action={eliminarRackAction.bind(null, rack.id)}
                  label="Eliminar rack"
                  confirmMessage="Eliminar este rack también elimina sus contenedores. Los productos guardados ahí quedarán sin ubicación asignada. ¿Continuar?"
                />
              </div>

              {rack.contenedores.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {rack.contenedores.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 rounded-full border border-green-200 px-3 py-1 text-sm text-green-800 dark:border-green-800 dark:text-green-200"
                    >
                      {c.nombre}
                      <DeleteButton
                        action={eliminarContenedorAction.bind(null, c.id)}
                        label="×"
                        confirmMessage={`¿Eliminar el contenedor "${c.nombre}"? Los productos guardados ahí quedarán sin ubicación asignada.`}
                        className="text-red-500 hover:text-red-700 dark:text-red-400"
                      />
                    </li>
                  ))}
                </ul>
              )}

              <ContenedorForm rackId={rack.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
