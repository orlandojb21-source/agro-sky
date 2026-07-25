// Constantes compartidas del módulo Proyectos (informe semanal de costos
// por trabajo) -- mismo patrón que CATEGORIAS_GASTO/COLABORADORES/
// DENOMINACIONES: la lista vive en un solo lugar y tanto el formulario
// como la validación la referencian desde aquí.

export const SLOTS_OPERACION = ["drone1", "drone2", "drone3", "subcontratista"] as const;
export type SlotOperacion = (typeof SLOTS_OPERACION)[number];

export const ETIQUETA_SLOT: Record<SlotOperacion, string> = {
  drone1: "Drone 1",
  drone2: "Drone 2",
  drone3: "Drone 3",
  subcontratista: "Subcontratista",
};

export const ROLES_PERSONAL = ["Operador", "Ayudante"] as const;
export type RolPersonal = (typeof ROLES_PERSONAL)[number];

export type CampoGastoOperacion =
  | "diesel"
  | "gasolina"
  | "viaticos"
  | "planilla"
  | "alquilerDrone"
  | "alquilerCarro"
  | "lavadoCarro";

// Las 7 categorías de gasto operativo de una operación (Drone/Subcontratista),
// siempre las mismas -- deliberadamente separadas de CATEGORIAS_GASTO
// (Caja Menuda/Planilla/Balance): el usuario confirmó que estos gastos van
// aparte, sin relación con Caja Menuda.
export const GASTOS_OPERACION: { campo: CampoGastoOperacion; etiqueta: string }[] = [
  { campo: "diesel", etiqueta: "Diésel" },
  { campo: "gasolina", etiqueta: "Gasolina 91" },
  { campo: "viaticos", etiqueta: "Viáticos" },
  { campo: "planilla", etiqueta: "Planilla" },
  { campo: "alquilerDrone", etiqueta: "Alquiler Drone" },
  { campo: "alquilerCarro", etiqueta: "Alquiler Carro" },
  { campo: "lavadoCarro", etiqueta: "Lavado de Carro" },
];
