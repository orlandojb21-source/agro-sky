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
