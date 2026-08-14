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
// un array vacío. Firmas siempre obligatorias -- un informe = un día de
// trabajo, un equipo, una firma (pedido explícito del usuario,
// 2026-08-14, revierte la variante "Abierto/Cerrado" de la migración
// 0085).
const informeCampoBaseSchema = z.object({
  // "cliente"/"tipoProyecto" se derivan del Proyecto elegido (ver
  // crearInformeCampoAction/editarInformeCampoAction) -- ya no los
  // escribe la persona directamente, pero siguen siendo parte del
  // esquema porque llegan igual en el FormData (hidden inputs) y el modo
  // sin conexión los necesita para mostrar el informe pendiente sin
  // tener que resolver el proyecto offline.
  cliente: z.string().trim().min(1, "Nombre del cliente requerido"),
  tipoProyecto: z.enum(["ingenio_santa_rosa", "particular"], { message: "Selecciona el tipo de proyecto" }),
  // Proyecto al que queda ligado este informe -- pedido explícito del
  // usuario, 2026-08-14: todo Informe de Campo, sin excepción, se crea
  // eligiendo un Proyecto ya existente.
  proyectoId: z.string().uuid("Selecciona un proyecto"),
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
  // Un solo valor para todo el informe (aplica a todo el equipo, igual
  // que hora de inicio/fin) -- cuando es "medio", el pago calculado por
  // lib/calculoIncentivos.ts se divide entre 2 (pedido del usuario,
  // 2026-08-10).
  jornada: z.enum(["completo", "medio"], { message: "Selecciona la jornada" }),
  operador: z.string().trim().min(1, "Selecciona un operador"),
  ayudantes: z.array(z.string().trim().min(1)).default([]),
  firmaAgroRuta: z.string().trim().min(1, "Falta la firma de Agro Sky"),
  nombreFirmaAgro: z.string().trim().min(1, "Falta el nombre de quien firma por Agro Sky"),
  firmaClienteRuta: z.string().trim().min(1, "Falta la firma del cliente"),
  nombreFirmaCliente: z.string().trim().min(1, "Falta el nombre de quien firma por el cliente"),
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

export const informeCampoSchema = informeCampoBaseSchema.refine(horaFinValida, horaFinOpciones);

export const informeCampoEditSchema = informeCampoBaseSchema
  .extend({ id: z.string().uuid() })
  .refine(horaFinValida, horaFinOpciones);
