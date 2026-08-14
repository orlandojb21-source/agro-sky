-- Agro Sky — migración 0091: Análisis de Proyecto se vincula al catálogo de Proyectos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Hasta ahora "Análisis de Proyecto" pedía escribir el nombre del proyecto a
-- mano. El usuario pidió que en vez de eso se elija un Proyecto ya creado
-- en el catálogo (mismo que usa Informe de Campo desde la migración 0087) y
-- que, a partir de esa elección, se carguen solos: el Cliente (del
-- catálogo) y las Hectáreas (suma de las parcelas de todos los Informes de
-- Campo de ese Proyecto). El Total pasa a calcularse siempre en el
-- servidor (Hectáreas × Precio), igual que ya se hace para cada fila de
-- proyecto_filas -- nunca se confía en lo que mande el navegador.
--
-- proyecto_informes tenía 0 filas en producción al momento de escribir esto
-- (verificado antes de aplicar), así que no hace falta backfill: la columna
-- nueva se agrega directamente como NOT NULL.

alter table proyecto_informes
  add column proyecto_id uuid not null references proyectos (id);

-- El texto "proyecto" se conserva (se sigue usando para el título del
-- detalle, el listado, y la búsqueda automática de viáticos en Caja
-- Menuda/Planilla por texto libre) pero deja de venir del formulario: se
-- deriva siempre del Proyecto elegido (código — nombre (cliente)).
drop function if exists crear_informe_proyecto(text, text, numeric, numeric, numeric, date, date, jsonb, jsonb);
drop function if exists editar_informe_proyecto(uuid, text, text, numeric, numeric, numeric, date, date, jsonb, jsonb);

create function crear_informe_proyecto(
  p_proyecto_id uuid,
  p_ubicacion text,
  p_precio numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb,
  p_gastos_operativos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informe_id uuid;
  v_proyecto_texto text;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2) := coalesce(p_precio, 0);
  v_fila jsonb;
  v_bloque jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_fila_hectareas numeric(12, 2);
  v_fila_precio numeric(12, 2);
  v_cantidad numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select pr.codigo || ' — ' || pr.nombre || ' (' || c.nombre || ')'
  into v_proyecto_texto
  from proyectos pr
  join clientes c on c.id = pr.cliente_id
  where pr.id = p_proyecto_id;

  if v_proyecto_texto is null then
    raise exception 'Proyecto no encontrado';
  end if;

  select coalesce(sum(icp.hectareas), 0)
  into v_hectareas
  from informes_campo ic
  join informe_campo_parcelas icp on icp.informe_id = ic.id
  where ic.proyecto_id = p_proyecto_id;

  insert into proyecto_informes (
    proyecto_id, proyecto, ubicacion, hectareas, precio, total, fecha_desde, fecha_hasta, registrado_por
  )
  values (
    p_proyecto_id, v_proyecto_texto, nullif(p_ubicacion, ''), v_hectareas, v_precio,
    round(v_hectareas * v_precio, 2), p_fecha_desde, p_fecha_hasta, auth.uid()
  )
  returning id into v_informe_id;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb))
  loop
    v_fila_hectareas := coalesce((v_fila ->> 'hectareas')::numeric, 0);
    v_fila_precio := coalesce((v_fila ->> 'precio')::numeric, 0);

    insert into proyecto_filas (informe_id, drone, hectareas, precio, total)
    values (v_informe_id, v_fila ->> 'drone', v_fila_hectareas, v_fila_precio, round(v_fila_hectareas * v_fila_precio, 2));
  end loop;

  for v_bloque in select * from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb))
  loop
    insert into proyecto_gastos_operativos (informe_id, drone, operador, ayudantes)
    values (
      v_informe_id,
      v_bloque ->> 'drone',
      nullif(v_bloque ->> 'operador', ''),
      array(select jsonb_array_elements_text(coalesce(v_bloque -> 'ayudantes', '[]'::jsonb)))
    )
    returning id into v_bloque_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_bloque -> 'items', '[]'::jsonb))
    loop
      v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
      v_fila_precio := coalesce((v_item ->> 'precio')::numeric, 0);

      insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
      values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_fila_precio, round(v_cantidad * v_fila_precio, 2));
    end loop;
  end loop;

  return v_informe_id;
end;
$$;

create function editar_informe_proyecto(
  p_informe_id uuid,
  p_proyecto_id uuid,
  p_ubicacion text,
  p_precio numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb,
  p_gastos_operativos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proyecto_texto text;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2) := coalesce(p_precio, 0);
  v_fila jsonb;
  v_bloque jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_fila_hectareas numeric(12, 2);
  v_fila_precio numeric(12, 2);
  v_cantidad numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select pr.codigo || ' — ' || pr.nombre || ' (' || c.nombre || ')'
  into v_proyecto_texto
  from proyectos pr
  join clientes c on c.id = pr.cliente_id
  where pr.id = p_proyecto_id;

  if v_proyecto_texto is null then
    raise exception 'Proyecto no encontrado';
  end if;

  select coalesce(sum(icp.hectareas), 0)
  into v_hectareas
  from informes_campo ic
  join informe_campo_parcelas icp on icp.informe_id = ic.id
  where ic.proyecto_id = p_proyecto_id;

  update proyecto_informes
  set proyecto_id = p_proyecto_id,
      proyecto = v_proyecto_texto,
      ubicacion = nullif(p_ubicacion, ''),
      hectareas = v_hectareas,
      precio = v_precio,
      total = round(v_hectareas * v_precio, 2),
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
    v_fila_hectareas := coalesce((v_fila ->> 'hectareas')::numeric, 0);
    v_fila_precio := coalesce((v_fila ->> 'precio')::numeric, 0);

    insert into proyecto_filas (informe_id, drone, hectareas, precio, total)
    values (p_informe_id, v_fila ->> 'drone', v_fila_hectareas, v_fila_precio, round(v_fila_hectareas * v_fila_precio, 2));
  end loop;

  for v_bloque in select * from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb))
  loop
    insert into proyecto_gastos_operativos (informe_id, drone, operador, ayudantes)
    values (
      p_informe_id,
      v_bloque ->> 'drone',
      nullif(v_bloque ->> 'operador', ''),
      array(select jsonb_array_elements_text(coalesce(v_bloque -> 'ayudantes', '[]'::jsonb)))
    )
    returning id into v_bloque_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_bloque -> 'items', '[]'::jsonb))
    loop
      v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
      v_fila_precio := coalesce((v_item ->> 'precio')::numeric, 0);

      insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
      values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_fila_precio, round(v_cantidad * v_fila_precio, 2));
    end loop;
  end loop;
end;
$$;
