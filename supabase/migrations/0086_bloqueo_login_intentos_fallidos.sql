-- Bloqueo temporal de cuenta tras 5 intentos de login fallidos seguidos
-- (recomendación de la revisión de seguridad, hallazgo 1.6 en
-- SECURITY_REVIEW.md). Supabase Auth no ofrece esto de fábrica -- su
-- límite es de tasa (requests por hora), no un contador de intentos
-- fallidos por cuenta -- así que se construye aquí.
--
-- login_intentos guarda, por correo, cuántos intentos fallidos lleva
-- seguidos y hasta cuándo queda bloqueado. Nunca se accede desde el
-- navegador ni con la anon key -- solo el servidor, con la
-- service_role key (mismo patrón ya usado en lib/actions/usuarios.ts,
-- ver lib/supabase/admin.ts), ANTES de que exista una sesión (por
-- diseño: este chequeo pasa justo antes de intentar el login). Por eso
-- RLS está activo pero sin ninguna política -- ni siquiera un usuario
-- autenticado puede leer o escribir esta tabla directo.
create table login_intentos (
  email text primary key,
  intentos_fallidos int not null default 0,
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz not null default now()
);

alter table login_intentos enable row level security;

-- Recordatorio (mismo error ya cometido y corregido en 0061/0063/0064/
-- 0065/0070/0085): si esta función cambia de firma en el futuro, hay
-- que borrar la firma EXACTA vieja con "drop function if exists" antes
-- de crear la nueva, o queda una versión huérfana.
create function registrar_intento_login_fallido(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_intentos int;
begin
  insert into login_intentos (email, intentos_fallidos, actualizado_en)
  values (v_email, 1, now())
  on conflict (email) do update
    set intentos_fallidos = login_intentos.intentos_fallidos + 1,
        actualizado_en = now()
  returning intentos_fallidos into v_intentos;

  if v_intentos >= 5 then
    update login_intentos
      set bloqueado_hasta = now() + interval '15 minutes',
          intentos_fallidos = 0
      where email = v_email;
  end if;
end;
$$;

create function limpiar_intentos_login(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from login_intentos where email = lower(trim(p_email));
end;
$$;

-- Sin "grant execute ... to authenticated/anon" a propósito: estas 2
-- funciones solo se llaman con la service_role key (que se salta los
-- grants), nunca desde el navegador -- si alguien pudiera llamar
-- limpiar_intentos_login directo, podría resetear el bloqueo de
-- cualquier cuenta.
