// Único correo con acceso al registro de Auditoría (src/app/(dashboard)/auditoria),
// sin importar el rol -- pedido explícito del usuario, 2026-08-14.
export const CORREO_AUDITORIA = "orlandojb.21@gmail.com";

export function esAuditor(correo: string | null | undefined): boolean {
  return correo === CORREO_AUDITORIA;
}
