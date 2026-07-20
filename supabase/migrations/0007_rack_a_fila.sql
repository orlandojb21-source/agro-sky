-- Agro Sky — migracion 0007: renombra Rack a Fila
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

alter table productos rename column rack to fila;
