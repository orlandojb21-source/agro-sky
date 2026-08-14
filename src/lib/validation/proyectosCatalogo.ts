import { z } from "zod";

// El código (columna "codigo") no lo escribe el usuario -- se genera solo
// (ASPP-0001) con un trigger en la base de datos al insertar (ver
// migración 0087, mismo patrón que servicios/productos en 0025). No forma
// parte de este schema.
export const proyectoCatalogoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido"),
  clienteId: z.string().uuid("Selecciona un cliente"),
  tipoProyecto: z.enum(["ingenio_santa_rosa", "particular"], {
    message: "Selecciona el tipo de proyecto",
  }),
});

export const proyectoCatalogoEditSchema = proyectoCatalogoSchema.extend({
  id: z.string().uuid(),
});
