-- Agro Sky — migracion 0020: categoria de gasto en Caja Menuda y Planilla
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El cliente quiere poder filtrar en Balance el gasto por categoria, sin
-- importar si salio de Caja Menuda o de Planilla -- por eso la misma lista
-- de categorias (definida en src/lib/categorias.ts) aplica a ambas tablas.
-- Nula a proposito: los movimientos ya guardados no tienen categoria y se
-- quedan asi (no se les puede exigir retroactivamente); de ahora en
-- adelante la app la exige al registrar un gasto nuevo en Caja Menuda.
-- En Planilla la categoria siempre es "Planilla" -- se asigna sola al
-- guardar, no hace falta que el usuario la elija (todo pago de planilla
-- es, por definicion, esa categoria).

alter table caja_gastos add column categoria text check (
  categoria in ('Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza', 'Planilla', 'Otro')
);

alter table planilla_pagos add column categoria text check (
  categoria in ('Combustible', 'Viáticos', 'Insumos de Oficina', 'Insumos de Limpieza', 'Planilla', 'Otro')
);

-- Los pagos de planilla ya existentes tambien son, por definicion,
-- categoria "Planilla" -- a diferencia de Caja Menuda, aqui si se puede
-- backfillear con certeza porque no hay ambiguedad posible.
update planilla_pagos set categoria = 'Planilla' where categoria is null;
