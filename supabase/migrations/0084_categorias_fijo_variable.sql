-- Agro Sky — migración 0084: clasificación Fijo/Variable + limpieza de categorías de Compras y Combustible
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-13): el cuadro "Vista mensual de gastos" de
-- Balance se divide en "Gastos Fijos" y "Gastos Variables" -- cada
-- categoría de Compras > Gastos necesita saber a cuál grupo pertenece.
-- Nullable a propósito: solo aplica a contexto='compras' (Caja Menuda no
-- se agrupa así), se exige en el servidor (crearCategoriaGastoAction), no
-- acá -- mismo criterio que ya usa la validez de categoría misma.
alter table categorias_gasto add column tipo text check (tipo in ('fijo', 'variable'));

update categorias_gasto set tipo = 'fijo'
  where contexto = 'compras' and nombre in ('alquiler', 'internet', 'Celulares', 'Visa');

-- "Caja de Seguro Social" y "otro" no los clasificó el usuario de forma
-- explícita -- se agrupan en Variable (más seguro que Fijo: no quedan
-- escondidos, y calzan mejor con su naturaleza real: CSS varía con la
-- planilla, "otro" es por definición impredecible).
update categorias_gasto set tipo = 'variable'
  where contexto = 'compras' and nombre in ('agua', 'luz', 'Impuestos', 'Caja de Seguro Social', 'otro');

-- "Celulares" reemplaza a "telefono" (pedido explícito del usuario) --
-- confirmado antes de borrarla que ningún gasto real usa esa categoría
-- todavía (gastos.categoria solo tiene 'Impuestos'/'alquiler'/'otro' hoy).
delete from categorias_gasto where contexto = 'compras' and nombre = 'telefono';

-- Combustible: se agrega "Gasolina" -- "Diésel" ya existe en Caja Menuda
-- y "Combustible"/"Combustible Extra" ya no existen (se limpiaron en
-- algún momento anterior, confirmado contra producción antes de esta
-- migración), así que no hace falta borrar nada más.
insert into categorias_gasto (contexto, nombre) values ('caja_menuda', 'Gasolina')
on conflict (contexto, nombre) do nothing;
