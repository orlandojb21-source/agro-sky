-- Agro Sky — migracion 0002: soporte con acceso total
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- "soporte" es el rol tecnico de la app (no atencion al cliente): debe
-- tener el mismo nivel de acceso que "administrador", incluyendo gestionar
-- usuarios y cambiar roles. Como todas las politicas RLS y el trigger de
-- proteccion de rol llaman a auth_es_administrador(), basta con redefinir
-- esta funcion — no hace falta tocar ninguna politica ni trigger.

create or replace function auth_es_administrador()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('administrador', 'soporte')
  );
$$;
