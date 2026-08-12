import { esSoporteOJefe, type Rol } from "@/lib/roles";

// Panama esta siempre en UTC-5 (sin horario de verano). El servidor puede
// correr en cualquier zona horaria (ej. UTC en Vercel), asi que en vez de
// usar los getters locales de Date, se resta el offset a mano y se leen
// los getters UTC -- mismo principio que hoyEnPanama() en lib/planilla.ts.
const OFFSET_PANAMA_MS = 5 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

function fechaISO(msDesdeAhora: number): string {
  const fecha = new Date(Date.now() - OFFSET_PANAMA_MS + msDesdeAhora);
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

// Gerente General y Soporte IT pueden guardar cualquier fecha -- el resto
// de los roles solo puede guardar/editar con fecha de HOY o AYER (hora de
// Panama), pedido explícito del usuario (2026-08-13). Aplica a la fecha
// PRINCIPAL de cada registro (cuándo pasó el hecho: Informe de Campo,
// Asistencia, Gastos, Caja Menuda, Pagos, Préstamos, Control de Horario,
// Ventas, Cotizaciones, Compras, Registro de Vuelo, Mantenimiento,
// reasignar operador de un drone) -- NO a fechas de vencimiento/tope de
// pago (son a futuro a propósito), a la fecha de activación de un drone
// (dato histórico, no "cuándo se cargó esto"), ni a "fecha desde" de
// quincena en Pagos (describe el periodo pagado, siempre en el pasado).
export function fechaPermitida(fecha: string, rol: Rol | null | undefined): boolean {
  if (esSoporteOJefe(rol)) return true;
  return fecha === fechaISO(0) || fecha === fechaISO(-UN_DIA_MS);
}

export const MENSAJE_FECHA_NO_PERMITIDA =
  "Con tu rol solo podés guardar con fecha de hoy o de ayer. Si necesitás una fecha anterior, pedile a Gerente General o Soporte IT.";

export const MENSAJE_REGISTRO_FECHA_VIEJA =
  "Este registro tiene una fecha de hace más de 2 días -- con tu rol ya no se puede editar. Pedile a Gerente General o Soporte IT.";
