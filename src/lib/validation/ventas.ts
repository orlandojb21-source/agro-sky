import { z } from "zod";

// El ITBMS (7%, solo Nuevo/Usado) se recalcula siempre en el servidor
// (funcion crear_venta en Postgres) a partir del "tipo" de cada linea, no
// de lo que mande el cliente -- aqui solo se valida la forma de los datos.
export const ventaItemSchema = z
  .object({
    tipo: z.enum(["nuevo", "usado", "servicio"]),
    productoId: z.string().uuid().nullable(),
    servicioId: z.string().uuid().nullable(),
    descripcion: z.string().trim().min(1, "Descripción requerida"),
    cantidad: z.number().positive("La cantidad debe ser mayor a cero"),
    precioUnitario: z.number().min(0, "El precio no puede ser negativo"),
  })
  .refine((item) => (item.tipo === "servicio" ? item.servicioId !== null : item.productoId !== null), {
    message: "Falta el producto o servicio seleccionado",
  })
  .refine(
    (item) => (item.tipo === "servicio" ? true : Number.isInteger(item.cantidad)),
    { message: "La cantidad de un producto debe ser un número entero" },
  );

export const ventaSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  clienteNombre: z.string().trim().min(1, "Nombre del cliente requerido"),
  clienteDocumento: z.string().trim().optional().default(""),
  nota: z.string().trim().optional().default(""),
  items: z.array(ventaItemSchema).min(1, "Agrega al menos un producto o servicio"),
});
