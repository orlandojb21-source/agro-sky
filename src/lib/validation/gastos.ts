import { z } from "zod";

// Etiquetas bonitas solo para las 6 categorías heredadas (guardadas en
// minúsculas desde antes de que la lista fuera administrable, ver
// migración 0068_categorias_gasto_dinamicas.sql) -- una categoría nueva
// agregada desde "+ Agregar categoría nueva" se guarda y se muestra tal
// cual la escriba el usuario, sin pasar por este mapa. No exhaustivo a
// propósito (Record<string, string>, no un enum): la lista real de
// categorías ya no vive en el código, vive en categorias_gasto.
export const CATEGORIA_GASTO_LABEL: Record<string, string> = {
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
    categoria: z.string().trim().min(1, "Selecciona una categoría"),
    // Solo aplica cuando categoria = "otro" -- se valida con .refine() abajo
    // porque su obligatoriedad depende de la categoría elegida. Se
    // mantiene por compatibilidad con datos viejos aunque ahora se puede
    // agregar una categoría real en vez de usar "otro" + texto libre.
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
    categoria: z.string().trim().min(1, "Selecciona una categoría"),
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
