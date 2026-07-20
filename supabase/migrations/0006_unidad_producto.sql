-- Agro Sky — migracion 0006: agrega Unidad a cada producto
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

alter table productos add column unidad text;
