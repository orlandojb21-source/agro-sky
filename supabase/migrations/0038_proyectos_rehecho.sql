-- Agro Sky — migracion 0038: Proyectos rehecho (primer paso)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El modulo de Proyectos anterior (migracion 0022: 4 operaciones fijas
-- Drone1/Drone2/Drone3/Subcontratista, tramos, 7 gastos operativos fijos,
-- personal por dia) nunca se uso -- quedo detras de "En Construccion" desde
-- que se construyo y nunca tuvo una sola fila real (verificado: 0 filas en
-- proyecto_informes antes de escribir esta migracion). El usuario pidio
-- rehacerlo desde cero para que coincida con el informe semanal real que ya
-- llena a mano (ver imagen de referencia: encabezado Proyecto/Ubicacion/
-- Hectareas/Precio/Total/Fecha + una tabla de filas libres Drone/Ha/Precio/
-- Total). Se construye paso a paso segun el usuario va describiendo el
-- resto del informe -- este es solo el primer paso (encabezado + filas).
--
-- Se elimina TODO el esquema anterior (tablas + funciones) ya que no hay
-- ninguna fila real que preservar.

drop function if exists eliminar_informe_proyecto(uuid);
drop function if exists crear_informe_proyecto(text, text, date, date, numeric, jsonb, jsonb);
drop table if exists proyecto_tramos, proyecto_personal_dias, proyecto_operaciones, proyecto_informes cascade;

-- Los 6 campos del encabezado se llenan siempre a mano (pedido explicito
-- del usuario) -- no se recalculan a partir de las filas de abajo, aunque
-- en el informe de referencia terminen coincidiendo con la suma de esas
-- filas. Fecha es un rango (fecha_desde/fecha_hasta) porque es un informe
-- semanal, igual que el modulo anterior.
create table proyecto_informes (
  id uuid primary key default gen_random_uuid(),
  proyecto text not null,
  ubicacion text,
  hectareas numeric(12, 2),
  precio numeric(12, 2),
  total numeric(12, 2),
  fecha_desde date not null,
  fecha_hasta date not null,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

-- Filas libres del cuadro (Drone/Ha/Precio/Total) -- a diferencia del
-- modulo anterior, "drone" es texto libre (no un slot fijo de 4 opciones):
-- el informe de referencia repite la misma empresa varias veces con tarifas
-- distintas la misma semana (ej. "AGRO SKY 1" dos veces), y tambien incluye
-- filas de referencia con Ha en cero. "total" se calcula siempre en el
-- servidor (hectareas x precio), nunca se confia en lo que mande el
-- cliente -- mismo principio que crear_venta.
create table proyecto_filas (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references proyecto_informes (id) on delete cascade,
  drone text not null,
  hectareas numeric(12, 2) not null default 0 check (hectareas >= 0),
  precio numeric(12, 2) not null default 0 check (precio >= 0),
  total numeric(12, 2) not null default 0
);

alter table proyecto_informes enable row level security;
alter table proyecto_filas enable row level security;

-- Solo lectura directa via PostgREST: crear/eliminar siempre pasa por las
-- funciones de abajo (mismo motivo que Ventas/el Proyectos anterior).
grant select on proyecto_informes, proyecto_filas to authenticated;

create policy "usuarios con perfil ven informes de proyecto" on proyecto_informes
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven filas de proyecto" on proyecto_filas
  for select using (auth_tiene_perfil());

-- p_filas: jsonb array de objetos { "drone": text, "hectareas": numero, "precio": numero }
create function crear_informe_proyecto(
  p_proyecto text,
  p_ubicacion text,
  p_hectareas numeric,
  p_precio numeric,
  p_total numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_informe_id uuid;
  v_fila jsonb;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2);
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

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_proyecto(text, text, numeric, numeric, numeric, date, date, jsonb) to authenticated;

create function eliminar_informe_proyecto(p_informe_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  delete from proyecto_informes where id = p_informe_id;
end;
$$;

grant execute on function eliminar_informe_proyecto(uuid) to authenticated;
