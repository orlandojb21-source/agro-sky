-- Agro Sky — migración 0096: Detalle de pago de Planilla queda editable
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El Monto de cada día del Detalle de pago de Planilla se sugería solo
-- (misma tarifa que "Calcular pago sugerido") pero no se podía ajustar a
-- mano. Ahora sí: el set de filas (qué trabajador cobra por cuál Informe
-- de Campo) lo sigue derivando el servidor de los Informes de Campo del
-- Proyecto (nunca se confía en eso), pero el Monto de cada fila viaja tal
-- cual desde el navegador -- mismo principio que Precio en el cuadro
-- Drone/HA y Cantidad/Precio en Gastos Operativos.

drop function if exists crear_informe_proyecto(uuid, text, numeric, jsonb, jsonb, jsonb);
drop function if exists editar_informe_proyecto(uuid, uuid, text, numeric, jsonb, jsonb, jsonb);

-- p_planilla_detalle ahora es [{"informeCampoId": uuid, "colaborador": text,
-- "monto": numero}, ...] -- el Monto viene del navegador (sugerido con la
-- tarifa de calcularDetallePlanilla en lib/actions/proyectos.ts, pero
-- editable); si un trabajador/Informe de Campo no trae Monto (ej. se
-- agregó un Informe nuevo después de abrir el formulario), queda en 0.
create function crear_informe_proyecto(
  p_proyecto_id uuid,
  p_ubicacion text,
  p_precio numeric,
  p_filas jsonb,
  p_gastos_operativos jsonb,
  p_planilla_detalle jsonb
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
  v_informe_campo record;
  v_precio_fila numeric(12, 2);
  v_equipo record;
  v_equipo_key text;
  v_bloque_cliente jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_cantidad numeric(12, 2);
  v_item_precio numeric(12, 2);
  v_ic_planilla record;
  v_ayudante text;
  v_monto numeric(12, 2);
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
    proyecto_id, proyecto, ubicacion, hectareas, precio, total, fecha, registrado_por
  )
  values (
    p_proyecto_id, v_proyecto_texto, nullif(p_ubicacion, ''), v_hectareas, v_precio,
    round(v_hectareas * v_precio, 2), current_date, auth.uid()
  )
  returning id into v_informe_id;

  for v_informe_campo in
    select ic.id, ic.modelo_drone, coalesce(sum(icp.hectareas), 0) as hectareas
    from informes_campo ic
    left join informe_campo_parcelas icp on icp.informe_id = ic.id
    where ic.proyecto_id = p_proyecto_id
    group by ic.id, ic.modelo_drone
    order by ic.fecha, ic.creado_en
  loop
    select coalesce((elem ->> 'precio')::numeric, 0)
    into v_precio_fila
    from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) elem
    where (elem ->> 'informeCampoId')::uuid = v_informe_campo.id
    limit 1;
    v_precio_fila := coalesce(v_precio_fila, 0);

    insert into proyecto_filas (informe_id, informe_campo_id, drone, hectareas, precio, total)
    values (
      v_informe_id, v_informe_campo.id, v_informe_campo.modelo_drone, v_informe_campo.hectareas,
      v_precio_fila, round(v_informe_campo.hectareas * v_precio_fila, 2)
    );
  end loop;

  for v_equipo in
    select distinct
      btrim(ic.operador) as operador,
      coalesce(
        (select array_agg(btrim(a) order by btrim(a)) from unnest(ic.ayudantes) as a where btrim(a) <> ''),
        '{}'
      ) as ayudantes
    from informes_campo ic
    where ic.proyecto_id = p_proyecto_id
  loop
    v_equipo_key := v_equipo.operador || '||' || array_to_string(v_equipo.ayudantes, ',');

    select elem
    into v_bloque_cliente
    from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb)) elem
    where (elem ->> 'equipoKey') = v_equipo_key
    limit 1;

    insert into proyecto_gastos_operativos (informe_id, operador, ayudantes)
    values (v_informe_id, v_equipo.operador, v_equipo.ayudantes)
    returning id into v_bloque_id;

    if v_bloque_cliente is not null then
      for v_item in select * from jsonb_array_elements(coalesce(v_bloque_cliente -> 'items', '[]'::jsonb))
      loop
        v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
        v_item_precio := coalesce((v_item ->> 'precio')::numeric, 0);

        insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
        values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_item_precio, round(v_cantidad * v_item_precio, 2));
      end loop;
    end if;
  end loop;

  for v_ic_planilla in
    select id, fecha, btrim(operador) as operador, ayudantes
    from informes_campo
    where proyecto_id = p_proyecto_id and tipo_proyecto is not null
    order by fecha, creado_en
  loop
    select coalesce((elem ->> 'monto')::numeric, 0)
    into v_monto
    from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb)) elem
    where (elem ->> 'informeCampoId')::uuid = v_ic_planilla.id
      and elem ->> 'colaborador' = v_ic_planilla.operador
    limit 1;

    insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
    values (v_informe_id, v_ic_planilla.id, v_ic_planilla.operador, v_ic_planilla.fecha, coalesce(v_monto, 0));

    for v_ayudante in select btrim(a) from unnest(v_ic_planilla.ayudantes) as a where btrim(a) <> ''
    loop
      select coalesce((elem ->> 'monto')::numeric, 0)
      into v_monto
      from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb)) elem
      where (elem ->> 'informeCampoId')::uuid = v_ic_planilla.id
        and elem ->> 'colaborador' = v_ayudante
      limit 1;

      insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
      values (v_informe_id, v_ic_planilla.id, v_ayudante, v_ic_planilla.fecha, coalesce(v_monto, 0));
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
  p_filas jsonb,
  p_gastos_operativos jsonb,
  p_planilla_detalle jsonb
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
  v_informe_campo record;
  v_precio_fila numeric(12, 2);
  v_equipo record;
  v_equipo_key text;
  v_bloque_cliente jsonb;
  v_bloque_id uuid;
  v_item jsonb;
  v_cantidad numeric(12, 2);
  v_item_precio numeric(12, 2);
  v_ic_planilla record;
  v_ayudante text;
  v_monto numeric(12, 2);
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

  -- La fecha NO se toca acá a propósito: conserva la fecha en que se creó
  -- el análisis, igual que cualquier otro dato de auditoría.
  update proyecto_informes
  set proyecto_id = p_proyecto_id,
      proyecto = v_proyecto_texto,
      ubicacion = nullif(p_ubicacion, ''),
      hectareas = v_hectareas,
      precio = v_precio,
      total = round(v_hectareas * v_precio, 2)
  where id = p_informe_id;

  if not found then
    raise exception 'Informe no encontrado';
  end if;

  delete from proyecto_filas where informe_id = p_informe_id;
  delete from proyecto_gastos_operativos where informe_id = p_informe_id;
  delete from proyecto_planilla_detalle where informe_id = p_informe_id;

  for v_informe_campo in
    select ic.id, ic.modelo_drone, coalesce(sum(icp.hectareas), 0) as hectareas
    from informes_campo ic
    left join informe_campo_parcelas icp on icp.informe_id = ic.id
    where ic.proyecto_id = p_proyecto_id
    group by ic.id, ic.modelo_drone
    order by ic.fecha, ic.creado_en
  loop
    select coalesce((elem ->> 'precio')::numeric, 0)
    into v_precio_fila
    from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb)) elem
    where (elem ->> 'informeCampoId')::uuid = v_informe_campo.id
    limit 1;
    v_precio_fila := coalesce(v_precio_fila, 0);

    insert into proyecto_filas (informe_id, informe_campo_id, drone, hectareas, precio, total)
    values (
      p_informe_id, v_informe_campo.id, v_informe_campo.modelo_drone, v_informe_campo.hectareas,
      v_precio_fila, round(v_informe_campo.hectareas * v_precio_fila, 2)
    );
  end loop;

  for v_equipo in
    select distinct
      btrim(ic.operador) as operador,
      coalesce(
        (select array_agg(btrim(a) order by btrim(a)) from unnest(ic.ayudantes) as a where btrim(a) <> ''),
        '{}'
      ) as ayudantes
    from informes_campo ic
    where ic.proyecto_id = p_proyecto_id
  loop
    v_equipo_key := v_equipo.operador || '||' || array_to_string(v_equipo.ayudantes, ',');

    select elem
    into v_bloque_cliente
    from jsonb_array_elements(coalesce(p_gastos_operativos, '[]'::jsonb)) elem
    where (elem ->> 'equipoKey') = v_equipo_key
    limit 1;

    insert into proyecto_gastos_operativos (informe_id, operador, ayudantes)
    values (p_informe_id, v_equipo.operador, v_equipo.ayudantes)
    returning id into v_bloque_id;

    if v_bloque_cliente is not null then
      for v_item in select * from jsonb_array_elements(coalesce(v_bloque_cliente -> 'items', '[]'::jsonb))
      loop
        v_cantidad := coalesce((v_item ->> 'cantidad')::numeric, 0);
        v_item_precio := coalesce((v_item ->> 'precio')::numeric, 0);

        insert into proyecto_gastos_operativos_items (gasto_operativo_id, categoria, cantidad, precio, total)
        values (v_bloque_id, v_item ->> 'categoria', v_cantidad, v_item_precio, round(v_cantidad * v_item_precio, 2));
      end loop;
    end if;
  end loop;

  for v_ic_planilla in
    select id, fecha, btrim(operador) as operador, ayudantes
    from informes_campo
    where proyecto_id = p_proyecto_id and tipo_proyecto is not null
    order by fecha, creado_en
  loop
    select coalesce((elem ->> 'monto')::numeric, 0)
    into v_monto
    from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb)) elem
    where (elem ->> 'informeCampoId')::uuid = v_ic_planilla.id
      and elem ->> 'colaborador' = v_ic_planilla.operador
    limit 1;

    insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
    values (p_informe_id, v_ic_planilla.id, v_ic_planilla.operador, v_ic_planilla.fecha, coalesce(v_monto, 0));

    for v_ayudante in select btrim(a) from unnest(v_ic_planilla.ayudantes) as a where btrim(a) <> ''
    loop
      select coalesce((elem ->> 'monto')::numeric, 0)
      into v_monto
      from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb)) elem
      where (elem ->> 'informeCampoId')::uuid = v_ic_planilla.id
        and elem ->> 'colaborador' = v_ayudante
      limit 1;

      insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
      values (p_informe_id, v_ic_planilla.id, v_ayudante, v_ic_planilla.fecha, coalesce(v_monto, 0));
    end loop;
  end loop;
end;
$$;
