import { z } from "zod";

// Documento informativo para el cliente (no afecta ningún cálculo de pago)
// -- todos los campos técnicos son texto libre porque no hay un formato o
// unidad fijos conocidos (el administrador escribe lo que le mandó el
// operador). "informeCampoId" es la única relación real con datos
// existentes: obliga a elegir un Informe de Campo ya guardado, no permite
// texto libre.
const informeDiarioBaseSchema = z.object({
  informeCampoId: z.string().uuid("Selecciona el Informe de Campo relacionado"),
  // "Nombre" en el documento -- es el cliente del Informe de Campo (ej.
  // "Ingenio Santa Rosa"), no quién voló el drone.
  cliente: z.string().trim().min(1, "Nombre requerido"),
  fecha: z.string().min(1, "Fecha requerida"),
  hectareasAplicadas: z.coerce.number().positive("Las hectáreas aplicadas deben ser mayores a cero"),
  tipoAplicacion: z.string().trim().min(1, "Tipo de aplicación requerido"),
  dosis: z.string().trim().min(1, "Dosis requerida"),
  boquillas: z.string().trim().min(1, "Boquillas requeridas"),
  alturaVuelo: z.string().trim().min(1, "Altura de vuelo requerida"),
  anchoPases: z.string().trim().min(1, "Ancho de pases requerido"),
  velocidad: z.string().trim().min(1, "Velocidad requerida"),
  nota: z.string().trim().optional().default(""),
});

export const informeDiarioSchema = informeDiarioBaseSchema;

export const informeDiarioEditSchema = informeDiarioBaseSchema.extend({ id: z.string().uuid() });
