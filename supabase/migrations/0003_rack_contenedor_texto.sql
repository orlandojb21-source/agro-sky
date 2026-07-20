-- Agro Sky — migracion 0003: Rack/Contenedor pasan a ser texto libre en cada producto
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Se reemplaza la relacion productos -> contenedores -> racks por dos
-- columnas de texto directo en productos, porque el usuario quiere
-- escribir el rack/contenedor al cargar el producto, no administrarlos
-- en una pantalla aparte. No habia datos guardados en estas tablas.

alter table productos add column rack text;
alter table productos add column contenedor text;
alter table productos drop column contenedor_id;

drop table if exists contenedores cascade;
drop table if exists racks cascade;
