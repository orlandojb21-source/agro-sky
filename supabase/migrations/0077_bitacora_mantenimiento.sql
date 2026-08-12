-- Agro Sky — migración 0077: Bitácora > Mantenimiento (Preventivo + Correctivo)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Tercera pestaña de Bitácora, junto a Drones y Registro de Vuelo.
--
-- PREVENTIVO: cada registro define su propio "tipo" (texto libre, ej.
-- "Revisión de motores", "Cambio de ESC") y su propio próximo intervalo
-- (horas de vuelo, hectáreas, vuelos y/o meses -- al menos uno) -- igual
-- que en la realidad, donde DJI recomienda intervalos distintos por
-- componente para el T40 (motores cada 100h/1000h, ESC cada 6 meses,
-- confirmado en ag.dji.com/newsroom/agras-t40-preseason-maintenance-guide).
-- Guarda una "foto" de los totales del dron (Registro de Vuelo, migración
-- 0075) al momento del mantenimiento, para poder calcular después cuándo
-- vence el próximo de ESE tipo para ESE dron.
--
-- CORRECTIVO: cambio de una o más piezas dañadas -- SIEMPRE debe salir de
-- un producto ya cargado en Inventario (pedido explícito del usuario,
-- 2026-08-11), lo que resta el stock de forma atómica (mismo patrón que
-- crear_venta/eliminar_venta, migración 0017).

create table drones_mantenimientos_preventivos (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references drones (id) on delete cascade,
  tipo text not null,
  fecha date not null,
  horas_vuelo_en_mantenimiento numeric(12, 2) not null default 0,
  area_cubierta_en_mantenimiento numeric(12, 2) not null default 0,
  vuelos_en_mantenimiento integer not null default 0,
  intervalo_horas numeric(12, 2),
  intervalo_hectareas numeric(12, 2),
  intervalo_vuelos integer,
  intervalo_meses integer,
  notas text,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now(),
  constraint mantenimiento_preventivo_al_menos_un_intervalo check (
    intervalo_horas is not null
    or intervalo_hectareas is not null
    or intervalo_vuelos is not null
    or intervalo_meses is not null
  )
);

alter table drones_mantenimientos_preventivos enable row level security;

grant select, insert, update, delete on drones_mantenimientos_preventivos to authenticated;

create policy "usuarios con perfil administran mantenimientos preventivos" on drones_mantenimientos_preventivos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create index drones_mantenimientos_preventivos_drone_id_idx on drones_mantenimientos_preventivos (drone_id);

-- Por cada combinación dron + tipo, trae el registro MÁS RECIENTE y ya
-- calculado si venció -- comparando los totales ACTUALES del dron contra
-- la foto de ese mantenimiento + su intervalo. "vencido" es true si
-- CUALQUIERA de los intervalos configurados (horas/hectáreas/vuelos/
-- meses) ya se cumplió, igual que un auto: "cada 5000km O 3 meses, lo
-- que llegue primero".
create view drones_mantenimientos_preventivos_estado as
select distinct on (m.drone_id, m.tipo)
  m.id,
  m.drone_id,
  d.nombre as drone_nombre,
  m.tipo,
  m.fecha,
  m.horas_vuelo_en_mantenimiento,
  m.area_cubierta_en_mantenimiento,
  m.vuelos_en_mantenimiento,
  m.intervalo_horas,
  m.intervalo_hectareas,
  m.intervalo_vuelos,
  m.intervalo_meses,
  d.horas_vuelo as horas_vuelo_actual,
  d.area_cubierta as area_cubierta_actual,
  d.vuelos as vuelos_actual,
  (
    (m.intervalo_horas is not null and d.horas_vuelo >= m.horas_vuelo_en_mantenimiento + m.intervalo_horas)
    or (m.intervalo_hectareas is not null and d.area_cubierta >= m.area_cubierta_en_mantenimiento + m.intervalo_hectareas)
    or (m.intervalo_vuelos is not null and d.vuelos >= m.vuelos_en_mantenimiento + m.intervalo_vuelos)
    or (m.intervalo_meses is not null and current_date >= (m.fecha + (m.intervalo_meses || ' months')::interval))
  ) as vencido
from drones_mantenimientos_preventivos m
join drones d on d.id = m.drone_id
order by m.drone_id, m.tipo, m.fecha desc, m.creado_en desc;

grant select on drones_mantenimientos_preventivos_estado to authenticated;

create table drones_mantenimientos_correctivos (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references drones (id) on delete cascade,
  fecha date not null,
  motivo text not null,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table drones_mantenimientos_correctivos_piezas (
  id uuid primary key default gen_random_uuid(),
  correctivo_id uuid not null references drones_mantenimientos_correctivos (id) on delete cascade,
  -- "set null" + descripcion fotografiada -- si el producto se borra de
  -- Inventario después, el historial de este correctivo no se pierde
  -- (mismo criterio que venta_items.producto_id, migración 0017).
  producto_id uuid references productos (id) on delete set null,
  descripcion text not null,
  cantidad integer not null check (cantidad > 0)
);

alter table drones_mantenimientos_correctivos enable row level security;
alter table drones_mantenimientos_correctivos_piezas enable row level security;

-- Solo lectura directa via PostgREST: crear/eliminar siempre pasan por
-- las funciones de abajo (necesitan tocar el stock de productos de forma
-- atómica, mismo motivo que Ventas).
grant select on drones_mantenimientos_correctivos, drones_mantenimientos_correctivos_piezas to authenticated;

create policy "usuarios con perfil ven mantenimientos correctivos" on drones_mantenimientos_correctivos
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven piezas de mantenimientos correctivos" on drones_mantenimientos_correctivos_piezas
  for select using (auth_tiene_perfil());

create index drones_mantenimientos_correctivos_drone_id_idx on drones_mantenimientos_correctivos (drone_id);

-- p_piezas: jsonb array de { "productoId": uuid, "cantidad": entero }
create function crear_mantenimiento_correctivo(
  p_drone_id uuid,
  p_fecha date,
  p_motivo text,
  p_piezas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correctivo_id uuid;
  v_pieza jsonb;
  v_producto_id uuid;
  v_cantidad integer;
  v_descripcion text;
  v_filas_afectadas int;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_piezas is null or jsonb_array_length(p_piezas) = 0 then
    raise exception 'El mantenimiento correctivo debe tener al menos una pieza';
  end if;

  insert into drones_mantenimientos_correctivos (drone_id, fecha, motivo, registrado_por)
  values (p_drone_id, p_fecha, p_motivo, auth.uid())
  returning id into v_correctivo_id;

  for v_pieza in select * from jsonb_array_elements(p_piezas)
  loop
    v_producto_id := (v_pieza ->> 'productoId')::uuid;
    v_cantidad := (v_pieza ->> 'cantidad')::integer;

    select descripcion into v_descripcion from productos where id = v_producto_id;
    if v_descripcion is null then
      raise exception 'Producto no encontrado en Inventario';
    end if;

    insert into drones_mantenimientos_correctivos_piezas (correctivo_id, producto_id, descripcion, cantidad)
    values (v_correctivo_id, v_producto_id, v_descripcion, v_cantidad);

    update productos
    set cantidad = cantidad - v_cantidad
    where id = v_producto_id
      and cantidad >= v_cantidad;

    get diagnostics v_filas_afectadas = row_count;
    if v_filas_afectadas = 0 then
      raise exception 'No hay stock suficiente para "%"', v_descripcion;
    end if;
  end loop;

  return v_correctivo_id;
end;
$$;

grant execute on function crear_mantenimiento_correctivo(uuid, date, text, jsonb) to authenticated;

-- Devuelve al inventario el stock de cada pieza antes de borrar (mismo
-- criterio que eliminar_venta).
create function eliminar_mantenimiento_correctivo(p_correctivo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pieza record;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  for v_pieza in
    select producto_id, cantidad
    from drones_mantenimientos_correctivos_piezas
    where correctivo_id = p_correctivo_id and producto_id is not null
  loop
    update productos set cantidad = cantidad + v_pieza.cantidad where id = v_pieza.producto_id;
  end loop;

  delete from drones_mantenimientos_correctivos where id = p_correctivo_id;
end;
$$;

grant execute on function eliminar_mantenimiento_correctivo(uuid) to authenticated;
