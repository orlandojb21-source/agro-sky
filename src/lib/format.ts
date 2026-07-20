export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

// Para columnas "date" de Postgres sin hora (ej: fecha de un gasto), que
// llegan como "2026-07-08". new Date() las interpreta como medianoche UTC;
// formatearlas en la hora local (Panama, UTC-5) las hace retroceder un dia.
// Forzar timeZone: "UTC" aqui las muestra tal como se guardaron. No usar
// para timestamps reales (ej: creado_en) -- esos si deben verse en hora
// local, para lo cual formatDate() sigue siendo el correcto.
export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}
