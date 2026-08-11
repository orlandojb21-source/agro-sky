// Fórmula de pago sugerido para Campo, confirmada por el usuario
// (2026-07-31, corregida 2026-08-01 tras una prueba real). Solo se usa
// para PRE-LLENAR el monto en Pagos -- el jefe siempre puede editarlo,
// nunca se guarda un monto sin que él lo confirme.
//
// Oficina: tarifa fija según jornada, sin hectáreas.
// Proyecto: el salario base cubre hasta cierta cantidad de hectáreas;
// cada hectárea que pase de ese umbral suma una tarifa marginal aparte --
// NO es "el mayor entre base y hectareas×tarifa" (así se diseñó una
// primera vez, pero el usuario lo corrigió con estos números reales).
//
// El umbral de hectáreas incluidas en el salario base (día completo) es
// 20 para Trabajo Particular y 15 para Ingenio Santa Rosa (2026-08-01: se
// había corregido a 20 para Ingenio con un caso de prueba, pero ese caso
// sumaba hectáreas de 2 informes de campo distintos del mismo día -- algo
// que nunca debía pasar, ver más abajo. Con la corrección de no sumar
// entre informes, el umbral real de Ingenio Santa Rosa vuelve a ser 15,
// confirmado directamente con el cliente).
//
// Desde 2026-08-10, Proyecto también puede ser medio día (se marca en el
// Informe de Campo, un solo valor para todo el equipo). Corregido
// 2026-08-11: medio día NO es "dividir el resultado final entre 2" -- el
// salario base Y el umbral de hectáreas incluidas se dividen entre 2
// (ej. Operador/Particular: $20 base, 10 ha incluidas en vez de $40/20 ha),
// pero la tarifa marginal por hectárea extra queda IGUAL que en día
// completo. Confirmado con el cliente que esto aplica a los 4 combos de
// rol × tipo de proyecto, aunque el umbral quede fraccionado (ej.
// Ingenio Santa Rosa: 15 ha ÷ 2 = 7.5 ha incluidas en medio día).
//
// IMPORTANTE: esta tarifa se aplica UNA VEZ POR CADA Informe de Campo, no
// una vez por día. Si una persona trabaja en 2 proyectos distintos el
// mismo día (2 informes), cada informe tiene su propia contabilidad de
// hectáreas y su propio salario base -- nunca se suman las hectáreas
// entre informes distintos, aunque sean del mismo tipo de proyecto (ver
// obtenerResumenAsistenciaAction en lib/actions/asistencia.ts).
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

export function calcularPagoProyecto(
  rol: RolDia,
  tipoProyecto: TipoProyecto,
  hectareas: number,
  jornada: Jornada,
): number {
  const { base, hectareasIncluidas, tarifaMarginal } = TARIFAS_PROYECTO[rol][tipoProyecto];
  // Medio día: se divide el salario base Y el umbral de hectáreas
  // incluidas entre 2 -- la tarifa marginal por hectárea extra no cambia.
  const baseEfectiva = jornada === "medio" ? base / 2 : base;
  const hectareasIncluidasEfectivas = jornada === "medio" ? hectareasIncluidas / 2 : hectareasIncluidas;
  const excedente = Math.max(0, hectareas - hectareasIncluidasEfectivas);
  const total = baseEfectiva + excedente * tarifaMarginal;
  return Math.round(total * 100) / 100;
}
