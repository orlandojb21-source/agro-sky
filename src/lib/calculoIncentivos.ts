// Fórmula de pago sugerido para Campo, confirmada por el usuario
// (2026-07-31). Solo se usa para PRE-LLENAR el monto en Pagos -- el jefe
// siempre puede editarlo, nunca se guarda un monto sin que él lo confirme.
//
// Oficina: tarifa fija según jornada, sin hectáreas.
// Proyecto (siempre jornada completa, no hay "medio día" en Proyecto): el
// salario base cubre hasta cierta cantidad de hectáreas; cada hectárea
// que pase de ese umbral suma una tarifa marginal aparte -- NO es "el
// mayor entre base y hectareas×tarifa" (así se diseñó una primera vez,
// pero el usuario lo corrigió con estos números reales).
export type RolDia = "operador" | "ayudante";
export type Jornada = "completo" | "medio";
export type TipoProyecto = "ingenio_santa_rosa" | "particular";

const TARIFAS_OFICINA: Record<RolDia, Record<Jornada, number>> = {
  operador: { completo: 40, medio: 20 },
  ayudante: { completo: 20, medio: 15 },
};

const TARIFAS_PROYECTO: Record<
  RolDia,
  Record<TipoProyecto, { base: number; hectareasIncluidas: number; tarifaMarginal: number }>
> = {
  operador: {
    ingenio_santa_rosa: { base: 30, hectareasIncluidas: 15, tarifaMarginal: 1.5 },
    particular: { base: 40, hectareasIncluidas: 20, tarifaMarginal: 2.0 },
  },
  ayudante: {
    ingenio_santa_rosa: { base: 25, hectareasIncluidas: 15, tarifaMarginal: 1.0 },
    particular: { base: 30, hectareasIncluidas: 20, tarifaMarginal: 1.0 },
  },
};

export function calcularPagoOficina(rol: RolDia, jornada: Jornada): number {
  return TARIFAS_OFICINA[rol][jornada];
}

export function calcularPagoProyecto(rol: RolDia, tipoProyecto: TipoProyecto, hectareas: number): number {
  const { base, hectareasIncluidas, tarifaMarginal } = TARIFAS_PROYECTO[rol][tipoProyecto];
  const excedente = Math.max(0, hectareas - hectareasIncluidas);
  return Math.round((base + excedente * tarifaMarginal) * 100) / 100;
}
