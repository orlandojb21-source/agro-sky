import { z } from "zod";
import { ventaItemSchema } from "@/lib/validation/ventas";

// Misma forma de item que una venta (nuevo/usado/servicio, cantidad,
// precio) -- una cotización es lo mismo que una venta, solo que todavía
// no se confirma ni descuenta stock.
export const cotizacionSchema = z.object({
  fecha: z.string().min(1, "Fecha requerida"),
  clienteNombre: z.string().trim().min(1, "Nombre del cliente requerido"),
  clienteDocumento: z.string().trim().optional().default(""),
  nota: z.string().trim().optional().default(""),
  items: z.array(ventaItemSchema).min(1, "Agrega al menos un producto o servicio"),
});
