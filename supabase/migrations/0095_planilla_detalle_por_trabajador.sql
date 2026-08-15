-- Agro Sky — migración 0095: Detalle de pago de Planilla por trabajador y día
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Nueva sección del Análisis de Proyecto, después de Gastos Operativos:
-- un desglose día por día de lo que le corresponde a CADA trabajador
-- (Operador o Ayudante) por su parte en los Informes de Campo del
-- Proyecto -- ej. "David Benavides: 08/11 $30.00, 08/13 $22.50, total
-- $52.50". Es 100% calculado (misma tarifa que "Calcular pago sugerido",
-- lib/calculoIncentivos.ts) -- no se llena a mano, así que el cálculo se
-- hace en el servidor (Server Action) y solo se inserta el resultado acá,
-- sin volver a derivarlo en SQL.
--
-- proyecto_informes seguía en 0 filas en producción al momento de escribir
-- esto (verificado antes de aplicar), así que no hace falta backfill.

create table proyecto_planilla_detalle (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references proyecto_informes (id) on delete cascade,
  informe_campo_id uuid not null references informes_campo (id),
  colaborador text not null,
  fecha date not null,
  monto numeric(12, 2) not null default 0
);

alter table proyecto_planilla_detalle enable row level security;

grant select on proyecto_planilla_detalle to authenticated;

create policy "usuarios con perfil ven detalle de planilla de proyecto" on proyecto_planilla_detalle
  for select using (auth_tiene_perfil());

drop function if exists crear_informe_proyecto(uuid, text, numeric, jsonb, jsonb);
drop function if exists editar_informe_proyecto(uuid, uuid, text, numeric, jsonb, jsonb);

-- p_planilla_detalle: jsonb array de objetos
--   { "informeCampoId": uuid, "colaborador": text, "fecha": date, "monto": numero }
-- ya calculado por el servidor (crearInformeProyectoAction/
-- editarInformeProyectoAction) -- se inserta tal cual, no se recalcula acá.
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
  v_dia jsonb;
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

  for v_dia in select * from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb))
  loop
    insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
    values (
      v_informe_id,
      (v_dia ->> 'informeCampoId')::uuid,
      v_dia ->> 'colaborador',
      (v_dia ->> 'fecha')::date,
      coalesce((v_dia ->> 'monto')::numeric, 0)
    );
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
  v_dia jsonb;
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

  for v_dia in select * from jsonb_array_elements(coalesce(p_planilla_detalle, '[]'::jsonb))
  loop
    insert into proyecto_planilla_detalle (informe_id, informe_campo_id, colaborador, fecha, monto)
    values (
      p_informe_id,
      (v_dia ->> 'informeCampoId')::uuid,
      v_dia ->> 'colaborador',
      (v_dia ->> 'fecha')::date,
      coalesce((v_dia ->> 'monto')::numeric, 0)
    );
  end loop;
end;
$$;
