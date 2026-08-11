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
// Desde 2026-08-10, Proyecto también puede ser medio día (se marca en el
// Informe de Campo, un solo valor para todo el equipo). Cada combo rol ×
// tipo de proyecto tiene su PROPIA tarifa de medio día -- NO se calcula
// dividiendo la de día completo entre 2, porque no todos los combos
// escalan igual (confirmado 2026-08-11 con un caso real: Ayudante en
// Trabajo Particular mantiene el mismo umbral de 20 ha y la misma tarifa
// marginal de $1/ha en medio día, solo baja el salario base de $30 a $15
// -- a diferencia de, por ejemplo, Operador en Trabajo Particular, donde
// el umbral SÍ se divide a la mitad, de 20 a 10 ha). Por eso cada
// combinación guarda sus valores de "completo" y "medio" por separado,
// tal cual los confirmó el cliente, en vez de asumir una fórmula general.
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

type TarifaProyecto = { base: number; hectareasIncluidas: number; tarifaMarginal: number };

const TARIFAS_PROYECTO: Record<RolDia, Record<TipoProyecto, Record<Jornada, TarifaProyecto>>> = {
  operador: {
    ingenio_santa_rosa: {
      completo: { base: 30, hectareasIncluidas: 15, tarifaMarginal: 1.5 },
      medio: { base: 15, hectareasIncluidas: 7.5, tarifaMarginal: 1.5 },
    },
    particular: {
      completo: { base: 40, hectareasIncluidas: 20, tarifaMarginal: 2.0 },
      medio: { base: 20, hectareasIncluidas: 10, tarifaMarginal: 2.0 },
    },
  },
  ayudante: {
    ingenio_santa_rosa: {
      completo: { base: 25, hectareasIncluidas: 15, tarifaMarginal: 1.0 },
      medio: { base: 12.5, hectareasIncluidas: 7.5, tarifaMarginal: 1.0 },
    },
    particular: {
      completo: { base: 30, hectareasIncluidas: 20, tarifaMarginal: 1.0 },
      // Excepción confirmada 2026-08-11: el umbral (20 ha) y la tarifa
      // marginal ($1/ha desde la 21) NO se dividen en medio día, solo el
      // salario base baja de $30 a $15.
      medio: { base: 15, hectareasIncluidas: 20, tarifaMarginal: 1.0 },
    },
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
  const { base, hectareasIncluidas, tarifaMarginal } = TARIFAS_PROYECTO[rol][tipoProyecto][jornada];
  const excedente = Math.max(0, hectareas - hectareasIncluidas);
  const total = base + excedente * tarifaMarginal;
  return Math.round(total * 100) / 100;
}
