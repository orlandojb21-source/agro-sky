-- Agro Sky — migracion 0040: Proyectos, segundo cuadro (Gastos operativos)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Debajo del primer cuadro (Drone/Ha/Precio/Total) se puede agregar uno o
-- mas bloques de "Gastos operativos" por drone: un nombre de drone + una
-- tabla de 7 categorias fijas (Diesel, Gasolina 91, Viaticos, Planilla,
-- Alquiler Drone, Alquiler de Carro, Lavado de Carro), cada una con
-- Cantidad/Precio unitario/Total (igual patron que el primer cuadro:
-- Total = Cantidad x Precio, siempre calculado en el servidor).
--
-- El monto de "Planilla" se puede traer automaticamente sumando pagos
-- reales de planilla_pagos que cumplan las 3 condiciones que dio el
-- usuario: tipo_trabajo = 'proyecto', la fecha del pago cae dentro de la
-- semana del informe, y la Descripcion del pago coincide EXACTAMENTE con
-- el nombre del proyecto del informe -- esa busqueda se hace desde la app
-- (lee planilla_pagos, que ya es de solo lectura para cualquier rol con
-- perfil), no hace falta una funcion nueva para eso. El resultado sigue
-- siendo editable a mano despues, como cualquier otro campo del cuadro.
--
-- Como crear_informe_proyecto/editar_informe_proyecto cambian su lista de
-- parametros, hay que borrarlas primero (create or replace no alcanza).

create table proyecto_gastos_operativos (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references proyecto_informes (id) on delete cascade,
  drone text not null
);

create table proyecto_gastos_operativos_items (
  id uuid primary key default gen_random_uuid(),
  gasto_operativo_id uuid not null references proyecto_gastos_operativos (id) on delete cascade,
  categoria text not null check (
    categoria in ('diesel', 'gasolina', 'viaticos', 'planilla', 'alquiler_drone', 'alquiler_carro', 'lavado_carro')
  ),
  cantidad numeric(12, 2) not null default 0 check (cantidad >= 0),
  precio numeric(12, 2) not null default 0 check (precio >= 0),
  total numeric(12, 2) not null default 0
);

alter table proyecto_gastos_operativos enable row level security;
alter table proyecto_gastos_operativos_items enable row level security;

grant select on proyecto_gastos_operativos, proyecto_gastos_operativos_items to authenticated;

create policy "usuarios con perfil ven gastos operativos de proyecto" on proyecto_gastos_operativos
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven items de gastos operativos" on proyecto_gastos_operativos_items
  for select using (auth_tiene_perfil());

drop function if exists crear_informe_proyecto(text, text, numeric, numeric, numeric, date, date, jsonb);
drop function if exists editar_informe_proyecto(uuid, text, text, numeric, numeric, numeric, date, date, jsonb);

-- p_gastos_operativos: jsonb array de objetos
--   { "drone": text, "items": [ { "categoria": text, "cantidad": numero, "precio": numero }, ... ] }
create function crear_informe_proyecto(
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
    insert into proyecto_gastos_operativos (informe_id, drone)
    values (v_informe_id, v_bloque ->> 'drone')
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

grant execute on function crear_informe_proyecto(text, text, numeric, numeric, numeric, date, date, jsonb, jsonb) to authenticated;

create function editar_informe_proyecto(
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
    insert into proyecto_gastos_operativos (informe_id, drone)
    values (p_informe_id, v_bloque ->> 'drone')
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

grant execute on function editar_informe_proyecto(uuid, text, text, numeric, numeric, numeric, date, date, jsonb, jsonb) to authenticated;
