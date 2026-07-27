import { z } from "zod";

// El servidor (funcion crear_solicitud_compra) vuelve a buscar tipo/
// numero_parte/descripcion/cantidad_actual del producto por su id -- aqui
// solo se valida la forma de los datos, igual que con Ventas.
export const itemSolicitudSchema = z.object({
  productoId: z.string().uuid(),
  tipo: z.enum(["nuevo", "usado"]),
  numeroParte: z.string(),
  descripcion: z.string(),
  cantidadActual: z.number(),
  cantidadSolicitada: z.number().int("Debe ser un número entero").positive("La cantidad debe ser mayor a cero"),
});

export const solicitudSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  nota: z.string().trim().optional().default(""),
  items: z.array(itemSolicitudSchema).min(1, "Agrega al menos un producto"),
});

export const aprobarSchema = z.object({
  proveedorNombre: z.string().trim().min(1, "Nombre del proveedor requerido"),
  proveedorContacto: z.string().trim().optional().default(""),
});

export const rechazarSchema = z.object({
  motivo: z.string().trim().optional().default(""),
});
