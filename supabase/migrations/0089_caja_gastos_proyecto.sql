-- Agro Sky — migración 0089: proyecto opcional en Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-14): poder ligar, opcionalmente, un gasto de
-- Caja Menuda a un Proyecto del catálogo (migración 0087) -- mismo criterio
-- que caja_gastos.proveedor_id (migración 0057) y gastos.proyecto_id
-- (migración 0088, Compras): "on delete set null", nunca obligatorio.
alter table caja_gastos add column proyecto_id uuid references proyectos (id) on delete set null;
