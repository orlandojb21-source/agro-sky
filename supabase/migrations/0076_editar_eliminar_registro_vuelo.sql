-- Agro Sky — migración 0076: editar/eliminar Registro de Vuelo (recalcula toda la cadena de lecturas)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cada registro de drones_vuelos guarda una LECTURA (ver migración 0075)
-- y su diferencia contra la lectura ANTERIOR de ese drone -- si se edita
-- o elimina un registro que no es el más reciente, todas las
-- diferencias de los registros posteriores (y los totales de "Datos del
-- Drone") quedarían mal si no se recalculan también. Por eso editar y
-- eliminar pasan por un recálculo completo de la cadena de ese drone
-- (ordenada por fecha), no solo un update puntual.
--
-- Restricción de rol (Soporte IT + Gerente General, pedido explícito del
-- usuario 2026-08-11): se aplica en el Server Action (esSoporteOJefe(),
-- src/lib/roles.ts), no acá -- mismo criterio que el resto del proyecto
-- (ej. Campo puede crear Informe de Campo pero no editar/eliminar, esa
-- restricción vive en informesCampo.ts, no en la función SQL).

create function recalcular_cadena_vuelo_drone(p_drone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registro record;
  v_horas_anterior numeric := 0;
  v_area_anterior numeric := 0;
  v_vuelos_anterior integer := 0;
  v_hay_registros boolean := false;
begin
  for v_registro in
    select id, horas_vuelo, area_cubierta, vuelos
    from drones_vuelos
    where drone_id = p_drone_id
    order by fecha, creado_en
  loop
    v_hay_registros := true;
    update drones_vuelos
    set horas_delta = v_registro.horas_vuelo - v_horas_anterior,
        area_delta = v_registro.area_cubierta - v_area_anterior,
        vuelos_delta = v_registro.vuelos - v_vuelos_anterior
    where id = v_registro.id;

    v_horas_anterior := v_registro.horas_vuelo;
    v_area_anterior := v_registro.area_cubierta;
    v_vuelos_anterior := v_registro.vuelos;
  end loop;

  update drones
  set horas_vuelo = case when v_hay_registros then v_horas_anterior else 0 end,
      area_cubierta = case when v_hay_registros then v_area_anterior else 0 end,
      vuelos = case when v_hay_registros then v_vuelos_anterior else 0 end
  where id = p_drone_id;
end;
$$;

grant execute on function recalcular_cadena_vuelo_drone(uuid) to authenticated;

-- registrar_vuelo_drone pasa a usar el mismo recálculo (antes calculaba
-- la diferencia solo contra el total actual del drone, que asume que
-- las lecturas siempre se cargan en orden cronológico -- con el
-- recálculo por fecha, una lectura cargada fuera de orden también queda
-- bien).
create or replace function registrar_vuelo_drone(
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

  -- Bloquea la fila del drone hasta el final -- evita que 2 cargas casi
  -- simultáneas del mismo drone se pisen entre sí al recalcular.
  perform 1 from drones where id = p_drone_id for update;
  if not found then
    raise exception 'Drone no encontrado';
  end if;

  insert into drones_vuelos (drone_id, fecha, operador, horas_vuelo, area_cubierta, vuelos, registrado_por)
  values (p_drone_id, p_fecha, p_operador, p_horas_vuelo, p_area_cubierta, p_vuelos, auth.uid())
  returning id into v_registro_id;

  perform recalcular_cadena_vuelo_drone(p_drone_id);

  return v_registro_id;
end;
$$;

grant execute on function registrar_vuelo_drone(uuid, date, text, numeric, numeric, integer) to authenticated;

create function editar_registro_vuelo_drone(
  p_registro_id uuid,
  p_fecha date,
  p_operador text,
  p_horas_vuelo numeric,
  p_area_cubierta numeric,
  p_vuelos integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drone_id uuid;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select drone_id into v_drone_id from drones_vuelos where id = p_registro_id for update;
  if v_drone_id is null then
    raise exception 'Registro no encontrado';
  end if;

  update drones_vuelos
  set fecha = p_fecha,
      operador = p_operador,
      horas_vuelo = p_horas_vuelo,
      area_cubierta = p_area_cubierta,
      vuelos = p_vuelos
  where id = p_registro_id;

  perform recalcular_cadena_vuelo_drone(v_drone_id);
end;
$$;

grant execute on function editar_registro_vuelo_drone(uuid, date, text, numeric, numeric, integer) to authenticated;

create function eliminar_registro_vuelo_drone(p_registro_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drone_id uuid;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select drone_id into v_drone_id from drones_vuelos where id = p_registro_id for update;
  if v_drone_id is null then
    raise exception 'Registro no encontrado';
  end if;

  delete from drones_vuelos where id = p_registro_id;

  perform recalcular_cadena_vuelo_drone(v_drone_id);
end;
$$;

grant execute on function eliminar_registro_vuelo_drone(uuid) to authenticated;
