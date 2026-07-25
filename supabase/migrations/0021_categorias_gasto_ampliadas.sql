-- Agro Sky — migracion 0021: agregar Taller, Alquiler y Generadores a las
-- categorias de gasto existentes (ver migracion 0020 y src/lib/categorias.ts)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

alter table caja_gastos drop constraint caja_gastos_categoria_check;
alter table caja_gastos add constraint caja_gastos_categoria_check check (
  categoria in (
    'Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza',
    'Planilla', 'Taller', 'Alquiler', 'Generadores', 'Otro'
  )
);

alter table planilla_pagos drop constraint planilla_pagos_categoria_check;
alter table planilla_pagos add constraint planilla_pagos_categoria_check check (
  categoria in (
    'Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza',
    'Planilla', 'Taller', 'Alquiler', 'Generadores', 'Otro'
  )
);
