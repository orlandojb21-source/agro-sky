-- Agro Sky — migración 0075: Registro de Vuelo pasa a ser por LECTURA (no por suma)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Corrección 2026-08-11: el operador no carga lo que sumó ese trabajo --
-- carga la LECTURA NUEVA (el total acumulado a esa fecha, tal cual lo
-- muestra el propio drone, como un odómetro), y el sistema calcula solo
-- la diferencia con la lectura anterior para guardarla como referencia.
-- "Datos del Drone" pasa a ser de solo lectura para estos 3 números --
-- ya no se editan a mano ahí, solo cambian a través de un nuevo Registro
-- de Vuelo (área separada, con su propio botón "+ Registro de Vuelo").
--
-- Ej: lectura anterior 8709.17 ha / 752.68 hrs / 12865 vuelos. Se carga
-- la lectura nueva 8720.17 ha / 756.81 hrs / 12869 vuelos. Diferencia
-- guardada: 11 ha / 4.13 hrs / 4 vuelos. drones.area_cubierta pasa a
-- valer 8720.17 (no 8709.17+11), porque ya es la lectura completa.

drop function if exists registrar_vuelo_drone(uuid, date, text, numeric, numeric, integer);

alter table drones_vuelos
  add column area_delta numeric(12, 2) not null default 0,
  add column horas_delta numeric(12, 2) not null default 0,
  add column vuelos_delta integer not null default 0;

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
  v_horas_actual numeric;
  v_area_actual numeric;
  v_vuelos_actual integer;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  -- "for update" bloquea la fila del drone hasta el final de la función
  -- -- evita que 2 registros casi simultáneos del mismo drone calculen la
  -- diferencia contra el mismo valor "anterior" y se pisen entre sí.
  select horas_vuelo, area_cubierta, vuelos
    into v_horas_actual, v_area_actual, v_vuelos_actual
    from drones
    where id = p_drone_id
    for update;

  if not found then
    raise exception 'Drone no encontrado';
  end if;

  insert into drones_vuelos (
    drone_id, fecha, operador, horas_vuelo, area_cubierta, vuelos,
    horas_delta, area_delta, vuelos_delta, registrado_por
  )
  values (
    p_drone_id, p_fecha, p_operador, p_horas_vuelo, p_area_cubierta, p_vuelos,
    p_horas_vuelo - v_horas_actual, p_area_cubierta - v_area_actual, p_vuelos - v_vuelos_actual,
    auth.uid()
  )
  returning id into v_registro_id;

  update drones
  set area_cubierta = p_area_cubierta,
      horas_vuelo = p_horas_vuelo,
      vuelos = p_vuelos
  where id = p_drone_id;

  return v_registro_id;
end;
$$;

grant execute on function registrar_vuelo_drone(uuid, date, text, numeric, numeric, integer) to authenticated;

-- Un operador es único por drone A LA VEZ (pedido explícito): si se le
-- asigna un drone nuevo (ej. el suyo entró a mantenimiento), se cierra
-- automáticamente cualquier asignación vigente que tuviera en CUALQUIER
-- otro drone, para que nunca quede como operador actual de 2 a la vez.
create function reasignar_operador_drone(
  p_drone_id uuid,
  p_operador text,
  p_fecha date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  update drones_operadores
  set fecha_hasta = p_fecha
  where operador = p_operador
    and fecha_hasta is null
    and drone_id <> p_drone_id;

  update drones_operadores
  set fecha_hasta = p_fecha
  where drone_id = p_drone_id
    and fecha_hasta is null;

  insert into drones_operadores (drone_id, operador, fecha_desde, registrado_por)
  values (p_drone_id, p_operador, p_fecha, auth.uid());
end;
$$;

grant execute on function reasignar_operador_drone(uuid, text, date) to authenticated;
