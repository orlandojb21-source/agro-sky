import { z } from "zod";

export const parcelaInformeCampoSchema = z.object({
  numeroParcela: z.string().trim().min(1, "Falta el número de parcela"),
  hectareas: z.number().positive("Las hectáreas deben ser mayores a cero"),
});

export const productoInformeCampoSchema = z.object({
  productoActivo: z.string().trim().min(1, "Falta el producto activo"),
  ltsPorHectarea: z.number().positive("Los litros por hectárea deben ser mayores a cero"),
});

// Encabezado requerido en su totalidad (es un documento formal que se
// envía al cliente) + Parcelas con mínimo 1 fila. Productos es opcional
// -- no siempre se usa (pedido explícito del usuario), puede quedar en
// un array vacío.
//
// Firmas: obligatorias salvo que el informe se guarde "abierto" (solo
// Proyecto Particular, pedido del usuario 2026-08-13) -- mientras está
// abierto se van agregando días de trabajo (ver informeCampoDiaSchema)
// y las firmas se piden recién al cerrarlo (ver cerrarInformeCampoSchema).
const informeCampoBaseSchema = z.object({
  cliente: z.string().trim().min(1, "Nombre del cliente requerido"),
  fecha: z.string().min(1, "Fecha requerida"),
  finca: z.string().trim().min(1, "Finca requerida"),
  horaInicio: z.string().min(1, "Hora de inicio requerida"),
  horaFin: z.string().min(1, "Hora de finalización requerida"),
  meteorologia: z.string().trim().min(1, "Meteorología requerida"),
  tipoAplicacion: z.enum(["liquido", "granulado"], { message: "Selecciona el tipo de aplicación" }),
  modeloDrone: z.string().trim().min(1, "Modelo de drone requerido"),
  // Texto libre (no solo números) -- en el campo a veces anotan la dosis
  // con letras además del número, ej. "2.8qxHA" (pedido del usuario,
  // 2026-08-05).
  dosisPorHectarea: z.string().trim().min(1, "La dosis por hectárea es requerida"),
  // Determina la tarifa del cálculo de incentivos por hectárea de este
  // informe (ver lib/calculoIncentivos.ts) -- vive aquí y no en Asistencia
  // porque cada informe tiene su propia contabilidad de hectáreas, nunca
  // se suman entre informes distintos del mismo día.
  tipoProyecto: z.enum(["ingenio_santa_rosa", "particular"], { message: "Selecciona el tipo de proyecto" }),
  // Un solo valor para todo el informe (aplica a todo el equipo, igual
  // que hora de inicio/fin) -- cuando es "medio", el pago calculado por
  // lib/calculoIncentivos.ts se divide entre 2 (pedido del usuario,
  // 2026-08-10).
  jornada: z.enum(["completo", "medio"], { message: "Selecciona la jornada" }),
  // Solo "particular" puede ser "abierto" -- se valida con .refine() abajo
  // porque depende de tipoProyecto. Default "cerrado" mantiene el
  // comportamiento de siempre (un informe = un día, firmas obligatorias).
  estado: z.enum(["abierto", "cerrado"]).default("cerrado"),
  operador: z.string().trim().min(1, "Selecciona un operador"),
  ayudantes: z.array(z.string().trim().min(1)).default([]),
  firmaAgroRuta: z.string().trim().optional().default(""),
  nombreFirmaAgro: z.string().trim().optional().default(""),
  firmaClienteRuta: z.string().trim().optional().default(""),
  nombreFirmaCliente: z.string().trim().optional().default(""),
  parcelas: z.array(parcelaInformeCampoSchema).min(1, "Agrega al menos una parcela"),
  productos: z.array(productoInformeCampoSchema).default([]),
  // Opcional -- no bloquea guardar el informe (pedido explícito del
  // usuario, 2026-08-05), y se puede adjuntar más de una.
  imagenes: z.array(z.string().trim().min(1)).default([]),
});

const horaFinValida = (data: { horaInicio: string; horaFin: string }) => data.horaFin >= data.horaInicio;
const horaFinOpciones = {
  message: "La hora de finalización debe ser igual o posterior a la de inicio",
  path: ["horaFin"],
};

function estadoAbiertoSoloParticular(data: { estado: string; tipoProyecto: string }): boolean {
  return data.estado !== "abierto" || data.tipoProyecto === "particular";
}
const estadoAbiertoSoloParticularOpciones = {
  message: "Solo un informe de Proyecto Particular puede quedar Abierto",
  path: ["estado"],
};

function firmasRequeridasSiCerrado(data: {
  estado: string;
  firmaAgroRuta: string;
  nombreFirmaAgro: string;
  firmaClienteRuta: string;
  nombreFirmaCliente: string;
}): boolean {
  if (data.estado === "abierto") return true;
  return (
    data.firmaAgroRuta !== "" &&
    data.nombreFirmaAgro !== "" &&
    data.firmaClienteRuta !== "" &&
    data.nombreFirmaCliente !== ""
  );
}
const firmasRequeridasSiCerradoOpciones = {
  message: "Faltan las firmas -- dibuja y guarda ambas antes de guardar el informe",
  path: ["firmaAgroRuta"],
};

export const informeCampoSchema = informeCampoBaseSchema
  .refine(horaFinValida, horaFinOpciones)
  .refine(estadoAbiertoSoloParticular, estadoAbiertoSoloParticularOpciones)
  .refine(firmasRequeridasSiCerrado, firmasRequeridasSiCerradoOpciones);

// Editar un informe siempre exige ambas firmas (nunca se edita uno
// "abierto" -- ver editarInformeCampoAction, lo bloquea antes de llegar
// acá) -- mismo comportamiento de siempre, sin cambios.
export const informeCampoEditSchema = informeCampoBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(horaFinValida, horaFinOpciones)
  .refine(
    (data) =>
      data.firmaAgroRuta !== "" &&
      data.nombreFirmaAgro !== "" &&
      data.firmaClienteRuta !== "" &&
      data.nombreFirmaCliente !== "",
    firmasRequeridasSiCerradoOpciones,
  );

// Agregar un día de trabajo a un informe Particular "abierto" -- sin
// firmas (esas se piden recién al cerrar el informe completo).
export const informeCampoDiaSchema = z
  .object({
    informeId: z.string().uuid(),
    fecha: z.string().min(1, "Fecha requerida"),
    horaInicio: z.string().min(1, "Hora de inicio requerida"),
    horaFin: z.string().min(1, "Hora de finalización requerida"),
    jornada: z.enum(["completo", "medio"], { message: "Selecciona la jornada" }),
    operador: z.string().trim().min(1, "Selecciona un operador"),
    ayudantes: z.array(z.string().trim().min(1)).default([]),
    parcelas: z.array(parcelaInformeCampoSchema).min(1, "Agrega al menos una parcela"),
  })
  .refine(horaFinValida, horaFinOpciones);

// Cerrar un informe Particular "abierto" -- las 2 firmas ya son
// obligatorias acá (es el momento en que el informe queda completo).
export const cerrarInformeCampoSchema = z.object({
  id: z.string().uuid(),
  firmaAgroRuta: z.string().trim().min(1, "Falta la firma de Agro Sky"),
  nombreFirmaAgro: z.string().trim().min(1, "Falta el nombre de quien firma por Agro Sky"),
  firmaClienteRuta: z.string().trim().min(1, "Falta la firma del cliente"),
  nombreFirmaCliente: z.string().trim().min(1, "Falta el nombre de quien firma por el cliente"),
});
