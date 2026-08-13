-- Agro Sky — migración 0083: 2 hallazgos de una auditoría de seguridad completa
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Hallazgo 1: drones_mantenimientos_preventivos_estado (migración 0077)
-- se creó sin "security_invoker = true" -- por defecto en Postgres, una
-- vista corre con los permisos de su DUEÑO (quien la creó), no con los
-- de quien la consulta. Como el dueño también es dueño de "drones" y
-- "drones_mantenimientos_preventivos", la vista se saltaba la política
-- RLS auth_tiene_perfil() de esas 2 tablas -- cualquier sesión
-- autenticada (con o sin fila en "perfiles") podía leerla igual. Se
-- corrige sin tocar la definición de la vista, solo su comportamiento de
-- seguridad.
alter view drones_mantenimientos_preventivos_estado set (security_invoker = true);

-- Hallazgo 2: recalcular_cadena_vuelo_drone (migración 0076) es la única
-- función mutadora de Bitácora sin el chequeo auth_tiene_perfil() que sí
-- tienen sus 3 funciones hermanas del mismo archivo
-- (registrar_vuelo_drone/editar_registro_vuelo_drone/
-- eliminar_registro_vuelo_drone) -- cualquier sesión autenticada podía
-- forzar un recálculo con un drone_id arbitrario. Impacto real bajo (solo
-- recalcula de forma determinista a partir de datos ya existentes, no
-- inyecta valores), pero rompe el patrón de autorización sin excepción
-- del resto del esquema. Mismo cuerpo, solo se agrega el chequeo.
create or replace function recalcular_cadena_vuelo_drone(p_drone_id uuid)
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
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

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
