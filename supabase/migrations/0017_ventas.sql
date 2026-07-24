-- Agro Sky — migracion 0017: Ventas (nuevo, usado y servicios en una sola venta)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Una venta puede combinar productos Nuevo, Usado y Servicios del catalogo.
-- El ITBMS (7%) aplica solo a Nuevo/Usado, nunca a Servicios -- por eso cada
-- linea guarda su propio "aplica_itbms" y la venta guarda el subtotal
-- gravado (Nuevo/Usado) separado del exento (Servicios). Vender un producto
-- Nuevo/Usado debe descontar esa cantidad del inventario; eliminar la venta
-- debe devolverla. Ambas cosas (calcular totales de forma confiable y
-- descontar/restaurar stock sin arriesgar una venta a medias si algo falla)
-- se hacen en dos funciones de Postgres (crear_venta/eliminar_venta) en vez
-- de varias llamadas sueltas desde la app: si algo falla a mitad de camino
-- (ej. no hay suficiente stock), Postgres deshace todo lo que esa funcion
-- alcanzo a escribir -- no queda una venta a medias ni un stock descontado
-- de mas.

create table ventas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  cliente_nombre text not null,
  cliente_documento text,
  nota text,
  subtotal_gravado numeric(12, 2) not null default 0,
  subtotal_exento numeric(12, 2) not null default 0,
  itbms numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas (id) on delete cascade,
  tipo text not null check (tipo in ('nuevo', 'usado', 'servicio')),
  producto_id uuid references productos (id) on delete set null,
  servicio_id uuid references servicios (id) on delete set null,
  descripcion text not null,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  aplica_itbms boolean not null,
  subtotal numeric(12, 2) not null
);

alter table ventas enable row level security;
alter table venta_items enable row level security;

-- Solo lectura directa via PostgREST: crear/eliminar SIEMPRE pasa por las
-- funciones de abajo (nunca insert/update/delete directo a estas tablas),
-- para que el calculo de totales y el ajuste de stock no se puedan saltar.
grant select on ventas, venta_items to authenticated;

create policy "usuarios con perfil ven ventas" on ventas
  for select using (auth_tiene_perfil());

create policy "usuarios con perfil ven items de venta" on venta_items
  for select using (auth_tiene_perfil());

-- Crea una venta completa: calcula subtotal gravado/exento + ITBMS (7%
-- sobre Nuevo/Usado, nunca sobre Servicios) a partir de los items
-- recibidos -- nunca confia en un total calculado en el cliente -- inserta
-- la venta y sus lineas, y descuenta el stock de cada producto Nuevo/Usado
-- vendido. Si algun producto no tiene suficiente stock, revienta con una
-- excepcion y Postgres deshace todo (la venta completa, no solo esa linea).
--
-- p_items: jsonb array de objetos
--   { "tipo": "nuevo"|"usado"|"servicio",
--     "producto_id": uuid | null,   -- solo si tipo es nuevo/usado
--     "servicio_id": uuid | null,   -- solo si tipo es servicio
--     "descripcion": text,
--     "cantidad": numero,
--     "precio_unitario": numero }
create or replace function crear_venta(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_nota text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_venta_id uuid;
  v_item jsonb;
  v_tipo text;
  v_cantidad numeric(12, 2);
  v_precio numeric(12, 2);
  v_aplica_itbms boolean;
  v_item_subtotal numeric(12, 2);
  v_subtotal_gravado numeric(12, 2) := 0;
  v_subtotal_exento numeric(12, 2) := 0;
  v_itbms numeric(12, 2);
  v_total numeric(12, 2);
  v_filas_afectadas int;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto o servicio';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := v_item ->> 'tipo';
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
    -- El ITBMS se decide aqui por tipo, nunca por lo que mande el cliente:
    -- Nuevo/Usado siempre lo llevan, Servicios nunca.
    v_aplica_itbms := v_tipo in ('nuevo', 'usado');
    v_item_subtotal := round(v_cantidad * v_precio, 2);

    if v_aplica_itbms then
      v_subtotal_gravado := v_subtotal_gravado + v_item_subtotal;
    else
      v_subtotal_exento := v_subtotal_exento + v_item_subtotal;
    end if;
  end loop;

  v_itbms := round(v_subtotal_gravado * 0.07, 2);
  v_total := v_subtotal_gravado + v_subtotal_exento + v_itbms;

  insert into ventas (
    fecha, cliente_nombre, cliente_documento, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_nota, ''),
    v_subtotal_gravado, v_subtotal_exento, v_itbms, v_total, auth.uid()
  )
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := v_item ->> 'tipo';
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
    v_aplica_itbms := v_tipo in ('nuevo', 'usado');
    v_item_subtotal := round(v_cantidad * v_precio, 2);

    insert into venta_items (
      venta_id, tipo, producto_id, servicio_id, descripcion,
      cantidad, precio_unitario, aplica_itbms, subtotal
    )
    values (
      v_venta_id,
      v_tipo,
      nullif(v_item ->> 'producto_id', '')::uuid,
      nullif(v_item ->> 'servicio_id', '')::uuid,
      v_item ->> 'descripcion',
      v_cantidad,
      v_precio,
      v_aplica_itbms,
      v_item_subtotal
    );

    if v_tipo in ('nuevo', 'usado') then
      update productos
      set cantidad = cantidad - v_cantidad::integer
      where id = (v_item ->> 'producto_id')::uuid
        and cantidad >= v_cantidad::integer;

      get diagnostics v_filas_afectadas = row_count;
      if v_filas_afectadas = 0 then
        raise exception 'No hay stock suficiente para "%"', v_item ->> 'descripcion';
      end if;
    end if;
  end loop;

  return v_venta_id;
end;
$$;

grant execute on function crear_venta(date, text, text, text, jsonb) to authenticated;

-- Elimina una venta y devuelve al inventario el stock de sus lineas
-- Nuevo/Usado antes de borrarla (venta_items se elimina solo por el
-- "on delete cascade" de la referencia a ventas).
create or replace function eliminar_venta(p_venta_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_item record;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  for v_item in
    select producto_id, cantidad
    from venta_items
    where venta_id = p_venta_id and tipo in ('nuevo', 'usado') and producto_id is not null
  loop
    update productos
    set cantidad = cantidad + v_item.cantidad::integer
    where id = v_item.producto_id;
  end loop;

  delete from ventas where id = p_venta_id;
end;
$$;

grant execute on function eliminar_venta(uuid) to authenticated;
