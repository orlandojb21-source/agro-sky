import { z } from "zod";

export const CATEGORIAS_GASTO = [
  "alquiler",
  "luz",
  "agua",
  "internet",
  "telefono",
  "otro",
] as const;

export const CATEGORIA_GASTO_LABEL: Record<(typeof CATEGORIAS_GASTO)[number], string> = {
  alquiler: "Alquiler",
  luz: "Luz",
  agua: "Agua",
  internet: "Internet",
  telefono: "Teléfono",
  otro: "Otro",
};

const gastoBase = z
  .object({
    fecha: z.string().trim().min(1, "Fecha requerida"),
    proveedorId: z.string().trim().optional().default(""),
    categoria: z.enum(CATEGORIAS_GASTO),
    // Solo aplica cuando categoria = "otro" -- se valida con .refine() abajo
    // porque su obligatoriedad depende de la categoría elegida.
    categoriaOtro: z.string().trim().optional().default(""),
    numeroFactura: z.string().trim().optional().default(""),
    monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    descripcion: z.string().trim().optional().default(""),
    // Ruta del objeto en el bucket privado "gastos-comprobantes" (no una
    // URL pública) -- se sube antes de enviar el formulario, ver
    // subirComprobanteGastoAction en lib/actions/gastoComprobante.ts.
    comprobanteRuta: z.string().trim().optional().default(""),
  })
  .refine((data) => data.categoria !== "otro" || data.categoriaOtro !== "", {
    message: "Escribe la categoría del gasto",
    path: ["categoriaOtro"],
  });

export const gastoSchema = gastoBase;

export const gastoEditSchema = z
  .object({
    id: z.string().uuid(),
    fecha: z.string().trim().min(1, "Fecha requerida"),
    proveedorId: z.string().trim().optional().default(""),
    categoria: z.enum(CATEGORIAS_GASTO),
    categoriaOtro: z.string().trim().optional().default(""),
    numeroFactura: z.string().trim().optional().default(""),
    monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
    descripcion: z.string().trim().optional().default(""),
    comprobanteRuta: z.string().trim().optional().default(""),
  })
  .refine((data) => data.categoria !== "otro" || data.categoriaOtro !== "", {
    message: "Escribe la categoría del gasto",
    path: ["categoriaOtro"],
  });
