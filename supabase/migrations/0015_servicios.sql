-- Agro Sky — migracion 0015: catalogo de Servicios (tercera seccion de Inventario)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- A diferencia de Nuevo/Usado, un servicio no se guarda fisicamente, asi
-- que no tiene numero de parte, fila, contenedor, unidad ni cantidad --
-- solo un nombre, descripcion y un costo/precio de referencia. Cuando se
-- construya Ventas, el detalle y el precio de un servicio se podran
-- ajustar en cada venta especifica (no todos los servicios cuestan ni se
-- describen igual cada vez); costo/precio aqui son solo una referencia
-- inicial, por eso quedan permitidos en null.

create table servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  costo numeric(12, 2),
  precio numeric(12, 2),
  creado_por uuid references perfiles (id),
  actualizado_por uuid references perfiles (id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create trigger trg_servicios_actualizado_en
before update on servicios
for each row execute function actualizar_marca_de_tiempo();

alter table servicios enable row level security;

grant select, insert, update, delete on servicios to authenticated;

-- Mismo criterio que productos: cualquier usuario con perfil valido (los
-- 3 roles actuales) tiene acceso completo por ahora.
create policy "usuarios con perfil administran servicios" on servicios
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
