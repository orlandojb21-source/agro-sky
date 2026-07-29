-- Agro Sky — migracion 0041: Operador del drone en Gastos Operativos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cada bloque de Gastos Operativos ahora tambien guarda el Operador del
-- drone (colaborador de tipo Campo) -- un tercer factor, ademas de la
-- fecha y el nombre del proyecto, para que "Traer de Planilla"/"Traer de
-- Caja Menuda" busquen con mas precision: el colaborador del pago de
-- planilla (o el "Nombre" del movimiento de Caja Menuda, a quien se le
-- entrego el dinero) debe coincidir con el Operador elegido en el bloque.
--
-- No cambia la firma de crear_informe_proyecto/editar_informe_proyecto
-- (siguen recibiendo p_gastos_operativos como jsonb) -- solo cambia que
-- ahora leen tambien la clave "operador" de cada bloque, asi que alcanza
-- con create or replace.

alter table proyecto_gastos_operativos add column operador text;

create or replace function crear_informe_proyecto(
  p_proyecto text,
  p_ubicacion text,
  p_hectareas numeric,
  p_precio numeric,
  p_total numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb,
  p_gastos_operativos jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_informe_id uuid;
  v_fila jsonb;
  v_bloque jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2);
  v_cantidad numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  insert into proyecto_informes (
    proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta, registrado_por
  )
  values (
    p_proyecto, nullif(p_ubicacion, ''), p_hectareas, p_precio, p_total, p_fecha_desde, p_fecha_hasta, auth.uid()
  )
  returning id into v_informe_id;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb))
  loop
    v_hectareas := coalesce((v_fila ->> 'hectareas')::numeric, 0);
    v_precio := coalesce((v_fila ->> 'precio')::numeric, 0);

    insert into proyecto_filas (informe_id, drone, hectareas, precio, total)
    values (v_informe_id, v_fila ->> 'drone', v_hectareas, v_precio, round(v_hectareas * v_precio, 2));
  end loop;

  for v_bloque in select * from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb))
  loop
    insert into proyecto_gastos_operativos (informe_id, drone, operador)
    values (v_informe_id, v_bloque ->> 'drone', nullif(v_bloque ->> 'operador', ''))
    returning id into v_bloque_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_bloque -> 'items', '[]'::jsonb))
    loop
      v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
      v_precio := coalesce((v_item ->> 'precio')::numeric, 0);

      insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
      values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_precio, round(v_cantidad * v_precio, 2));
    end loop;
  end loop;

  return v_informe_id;
end;
$$;

create or replace function editar_informe_proyecto(
  p_informe_id uuid,
  p_proyecto text,
  p_ubicacion text,
  p_hectareas numeric,
  p_precio numeric,
  p_total numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb,
  p_gastos_operativos jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_fila jsonb;
  v_bloque jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2);
  v_cantidad numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  update proyecto_informes
  set proyecto = p_proyecto,
      ubicacion = nullif(p_ubicacion, ''),
      hectareas = p_hectareas,
      precio = p_precio,
      total = p_total,
      fecha_desde = p_fecha_desde,
      fecha_hasta = p_fecha_hasta
  where id = p_informe_id;

  if not found then
    raise exception 'Informe no encontrado';
  end if;

  delete from proyecto_filas where informe_id = p_informe_id;
  delete from proyecto_gastos_operativos where informe_id = p_informe_id;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb))
  loop
    v_hectareas := coalesce((v_fila ->> 'hectareas')::numeric, 0);
    v_precio := coalesce((v_fila ->> 'precio')::numeric, 0);

    insert into proyecto_filas (informe_id, drone, hectareas, precio, total)
    values (p_informe_id, v_fila ->> 'drone', v_hectareas, v_precio, round(v_hectareas * v_precio, 2));
  end loop;

  for v_bloque in select * from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb))
  loop
    insert into proyecto_gastos_operativos (informe_id, drone, operador)
    values (p_informe_id, v_bloque ->> 'drone', nullif(v_bloque ->> 'operador', ''))
    returning id into v_bloque_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_bloque -> 'items', '[]'::jsonb))
    loop
      v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
      v_precio := coalesce((v_item ->> 'precio')::numeric, 0);

      insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
      values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_precio, round(v_cantidad * v_precio, 2));
    end loop;
  end loop;
end;
$$;
