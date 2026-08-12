import { z } from "zod";

// Preventivo: el "tipo" es texto libre (ej. "Revisión de motores",
// "Cambio de ESC") -- cada dron puede tener varios tipos distintos, cada
// uno con su propio intervalo. Al menos uno de los 4 intervalos debe
// estar cargado (igual que un auto: "cada 5000km O 3 meses").
export const mantenimientoPreventivoSchema = z
  .object({
    droneId: z.string().uuid(),
    tipo: z.string().trim().min(1, "Tipo de mantenimiento requerido"),
    fecha: z.string().min(1, "Fecha requerida"),
    intervaloHoras: z.string().trim().optional().default(""),
    intervaloHectareas: z.string().trim().optional().default(""),
    intervaloVuelos: z.string().trim().optional().default(""),
    intervaloMeses: z.string().trim().optional().default(""),
    notas: z.string().trim().optional().default(""),
  })
  .refine(
    (v) => v.intervaloHoras || v.intervaloHectareas || v.intervaloVuelos || v.intervaloMeses,
    { message: "Cargá al menos un intervalo (horas, hectáreas, vuelos o meses)", path: ["intervaloHoras"] },
  );

// Correctivo: al menos 1 pieza, cada una vinculada a un producto real de
// Inventario (obligatorio, pedido explícito del usuario) -- "piezas"
// llega ya parseado desde JSON (armado en el cliente vía <input
// type="hidden">), mismo patrón que parcelas/productos en Informe de
// Campo (ver lib/actions/informesCampo.ts).
export const piezaCorrectivoSchema = z.object({
  productoId: z.string().uuid("Selecciona un producto de Inventario"),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a cero"),
});

export const mantenimientoCorrectivoSchema = z.object({
  droneId: z.string().uuid(),
  fecha: z.string().min(1, "Fecha requerida"),
  motivo: z.string().trim().min(1, "Motivo requerido"),
  piezas: z.array(piezaCorrectivoSchema).min(1, "Agregá al menos una pieza cambiada"),
});
