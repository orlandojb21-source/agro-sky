-- Agro Sky — migracion 0004: Soporte y Jefe gestionan usuarios (no Administrador)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Por pedido explicito del usuario, la gestion de usuarios (cambiar rol,
-- correo, asignar contraseña) queda en manos de los roles "soporte" y
-- "jefe" unicamente, no "administrador".

-- Renombrar no rompe las politicas RLS que ya usan esta funcion (Postgres
-- las enlaza por identidad de la funcion, no por su nombre en texto).
alter function auth_es_administrador() rename to auth_gestiona_usuarios;

create or replace function auth_gestiona_usuarios()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('soporte', 'jefe')
  );
$$;

-- El trigger SI hay que re-declararlo: a diferencia de las politicas, el
-- cuerpo de una funcion PL/pgSQL resuelve nombres en texto en cada
-- ejecucion, asi que seguiria buscando "auth_es_administrador" (que ya no
-- existe) si no se actualiza aqui.
create or replace function proteger_rol_perfil()
returns trigger
language plpgsql
as $$
begin
  if new.rol is distinct from old.rol
     and not auth_gestiona_usuarios()
     and auth.role() <> 'service_role' then
    raise exception 'No tienes permiso para cambiar el rol de un usuario';
  end if;
  return new;
end;
$$;
