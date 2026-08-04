-- Agro Sky — migración 0057: proveedor opcional en gastos de Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-04): poder ligar, opcionalmente, un gasto de
-- Caja Menuda a un proveedor ya guardado (migración 0056) -- por si algún
-- gasto chico sí involucra a un proveedor real. Nunca obligatorio.
alter table caja_gastos add column proveedor_id uuid references proveedores (id) on delete set null;
