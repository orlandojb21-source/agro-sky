-- Agro Sky — migracion 0023: agregar Comida Proyecto, Comida, Hielo,
-- Bidones, Diésel, Combustible Extra y Gastos Extras a las categorias de
-- gasto existentes (ver migraciones 0020/0021 y src/lib/categorias.ts)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

alter table caja_gastos drop constraint caja_gastos_categoria_check;
alter table caja_gastos add constraint caja_gastos_categoria_check check (
  categoria in (
    'Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza',
    'Planilla', 'Taller', 'Alquiler', 'Generadores',
    'Comida Proyecto', 'Comida', 'Hielo', 'Bidones', 'Diésel', 'Combustible Extra', 'Gastos Extras',
    'Otro'
  )
);

alter table planilla_pagos drop constraint planilla_pagos_categoria_check;
alter table planilla_pagos add constraint planilla_pagos_categoria_check check (
  categoria in (
    'Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza',
    'Planilla', 'Taller', 'Alquiler', 'Generadores',
    'Comida Proyecto', 'Comida', 'Hielo', 'Bidones', 'Diésel', 'Combustible Extra', 'Gastos Extras',
    'Otro'
  )
);
