import { ESTADO_DRONE_LABEL, type EstadoDrone } from "@/lib/validation/drones";

export function EstadoDroneBadge({ estado, detalle }: { estado: EstadoDrone; detalle?: string | null }) {
  const disponible = estado === "disponible";
  return (
    <span
      className={
        disponible
          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300"
          : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      }
      title={detalle ?? undefined}
    >
      {ESTADO_DRONE_LABEL[estado]}
      {!disponible && detalle ? ` — ${detalle}` : ""}
    </span>
  );
}
