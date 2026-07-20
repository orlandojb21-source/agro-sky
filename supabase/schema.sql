-- Agro Sky — esquema inicial (Fase 1: Inventario)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run

-- 1. Perfiles (une cada usuario que inicia sesion con su rol dentro de Agro Sky)
create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_completo text not null,
  rol text not null default 'soporte' check (rol in ('administrador', 'jefe', 'soporte')),
  creado_en timestamptz not null default now()
);

-- 2. Racks (ubicaciones fisicas de almacenamiento)
create table racks (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  creado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

-- 3. Contenedores (cada rack tiene varios contenedores)
create table contenedores (
  id uuid primary key default gen_random_uuid(),
  rack_id uuid not null references racks (id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now(),
  unique (rack_id, nombre)
);

-- 4. Productos de inventario (Nuevos y Usados son el mismo modelo,
-- diferenciados por la columna "tipo"; el numero de parte es unico
-- dentro de cada seccion, pero puede repetirse entre nuevo y usado)
create table productos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('nuevo', 'usado')),
  numero_parte text not null,
  descripcion text not null,
  cantidad integer not null default 0 check (cantidad >= 0),
  costo numeric(12, 2) not null default 0 check (costo >= 0),
  venta numeric(12, 2) not null default 0 check (venta >= 0),
  contenedor_id uuid references contenedores (id) on delete set null,
  creado_por uuid references perfiles (id),
  actualizado_por uuid references perfiles (id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tipo, numero_parte)
);

-- Mantiene actualizado_en al dia en cada edicion de un producto
create function actualizar_marca_de_tiempo()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger trg_productos_actualizado_en
before update on productos
for each row execute function actualizar_marca_de_tiempo();

-- Funcion de apoyo: el usuario que inicio sesion tiene un perfil valido?
create function auth_tiene_perfil()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.perfiles where id = auth.uid());
$$;

-- Funcion de apoyo: el usuario que inicio sesion es administrador?
create function auth_es_administrador()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.perfiles where id = auth.uid() and rol = 'administrador'
  );
$$;

-- Activar seguridad por fila en todas las tablas
alter table perfiles enable row level security;
alter table racks enable row level security;
alter table contenedores enable row level security;
alter table productos enable row level security;

-- Permisos base: un usuario que inicio sesion puede intentar leer/escribir
-- (las politicas de abajo son las que realmente filtran)
grant usage on schema public to authenticated;
grant select on perfiles to authenticated;
grant select, insert, update, delete on racks, contenedores, productos to authenticated;

-- Perfiles: cada quien ve su propia fila; el administrador ve y gestiona todas
create policy "ver mi perfil" on perfiles
  for select using (id = auth.uid() or auth_es_administrador());

create policy "administrador gestiona perfiles" on perfiles
  for update using (auth_es_administrador())
  with check (auth_es_administrador());

create policy "administrador elimina perfiles" on perfiles
  for delete using (auth_es_administrador());

-- Racks, contenedores y productos: cualquier usuario con perfil valido tiene
-- acceso completo por ahora (los 3 roles). Dejar preparado auth_es_administrador()
-- arriba permite restringir esto por rol mas adelante sin cambiar el esquema.
create policy "usuarios con perfil administran racks" on racks
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create policy "usuarios con perfil administran contenedores" on contenedores
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create policy "usuarios con perfil administran productos" on productos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- Para crear el primer administrador (obligatorio, es el unico paso manual):
-- 1. Supabase Dashboard > Authentication > Users > Add user (email + password).
-- 2. Copia el UUID de ese usuario y ejecuta:
--    insert into perfiles (id, nombre_completo, rol)
--    values ('<uuid-del-usuario>', 'Tu nombre', 'administrador');
-- Desde ahi, ese administrador ya puede crear el resto de usuarios
-- (Jefe/Soporte) directamente desde la pantalla "Usuarios" de la app.
