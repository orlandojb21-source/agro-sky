-- Agro Sky — migración 0074: Bitácora de Vuelo — historial de vuelo por drone
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cada vez que se hace un trabajo, el operador carga cuántas Horas de
-- Vuelo, Área Cubierta y Vuelos sumó ESE trabajo -- no el total nuevo del
-- drone, sino lo que se agrega. Al guardar, esos 3 valores se SUMAN a los
-- totales acumulados del drone (drones.area_cubierta/horas_vuelo/vuelos,
-- migración 0072) y además queda una fila en drones_vuelos con ese
-- registro, para tener el historial completo de cada carga (no solo el
-- total final). Ej: si Bumblebee tiene hoy 8709.17 ha / 752.68 hrs /
-- 12865 vuelos y se hace un trabajo de 123.23 ha / 5.52 hrs / 6 vuelos,
-- el operador carga esos 3 números (no 8832.4/758.2/12871) y el drone
-- queda con los totales nuevos automáticamente.
--
-- La suma tiene que ser atómica (insertar el registro + actualizar el
-- drone en la misma transacción) para no perder datos si 2 personas
-- cargan un registro del mismo drone casi al mismo tiempo -- mismo
-- patrón security definer que crear_informe_campo (migración 0047).

create table drones_vuelos (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references drones (id) on delete cascade,
  fecha date not null,
  operador text not null,
  horas_vuelo numeric(12, 2) not null check (horas_vuelo >= 0),
  area_cubierta numeric(12, 2) not null check (area_cubierta >= 0),
  vuelos integer not null check (vuelos >= 0),
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table drones_vuelos enable row level security;

-- Solo lectura directa via PostgREST: crear siempre pasa por la función
-- de abajo (necesita también actualizar drones de forma atómica).
grant select on drones_vuelos to authenticated;

create policy "usuarios con perfil ven bitacora de vuelo" on drones_vuelos
  for select using (auth_tiene_perfil());

create index drones_vuelos_drone_id_idx on drones_vuelos (drone_id);

create function registrar_vuelo_drone(
  p_drone_id uuid,
  p_fecha date,
  p_operador text,
  p_horas_vuelo numeric,
  p_area_cubierta numeric,
  p_vuelos integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro_id uuid;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  insert into drones_vuelos (drone_id, fecha, operador, horas_vuelo, area_cubierta, vuelos, registrado_por)
  values (p_drone_id, p_fecha, p_operador, p_horas_vuelo, p_area_cubierta, p_vuelos, auth.uid())
  returning id into v_registro_id;

  update drones
  set area_cubierta = area_cubierta + p_area_cubierta,
      horas_vuelo = horas_vuelo + p_horas_vuelo,
      vuelos = vuelos + p_vuelos
  where id = p_drone_id;

  if not found then
    raise exception 'Drone no encontrado';
  end if;

  return v_registro_id;
end;
$$;

grant execute on function registrar_vuelo_drone(uuid, date, text, numeric, numeric, integer) to authenticated;
