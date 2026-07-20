-- Agro Sky — migracion 0001: perfil auto-editable
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

-- Datos basicos que cada usuario puede completar/editar de si mismo
alter table perfiles add column telefono text;

-- Permite que cada usuario edite su propia fila (nombre_completo, telefono).
-- Se SUMA a la politica "administrador gestiona perfiles" ya existente, no
-- la reemplaza: un administrador sigue pudiendo editar cualquier perfil.
create policy "cada usuario actualiza su propio perfil" on perfiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Protege la columna rol: aunque la politica de arriba deje pasar el UPDATE
-- de la propia fila, este trigger bloquea cualquier intento de cambiar el
-- propio rol si quien lo hace no es administrador (ni siquiera via API
-- directa, sin pasar por la pantalla de Usuarios). La service_role key
-- (scripts de mantenimiento con acceso total) queda exenta, igual que ya
-- esta exenta de RLS en el resto del esquema.
create function proteger_rol_perfil()
returns trigger
language plpgsql
as $$
begin
  if new.rol is distinct from old.rol
     and not auth_es_administrador()
     and auth.role() <> 'service_role' then
    raise exception 'Solo un administrador puede cambiar el rol de un usuario';
  end if;
  return new;
end;
$$;

create trigger trg_proteger_rol_perfil
before update on perfiles
for each row execute function proteger_rol_perfil();
