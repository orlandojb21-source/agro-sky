-- Agro Sky — migracion 0018: Cotizaciones (dentro del menu Ventas)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Una cotizacion tiene la misma forma que una venta (cliente, items,
-- subtotal gravado/exento, ITBMS, total) pero NO descuenta stock -- es
-- solo un estimado. Si el cliente confirma, la cotizacion se convierte en
-- una venta real (factura): se crea la venta con la misma logica y guard
-- de stock de siempre, y la cotizacion queda marcada "confirmada" con un
-- link a esa venta (se conserva como historial de "que se cotizo").
--
-- Para no duplicar la logica de calcular ITBMS/totales y descontar stock,
-- se saca el cuerpo de crear_venta a una funcion interna
-- (crear_venta_interna) que tanto crear_venta como confirmar_cotizacion
-- reutilizan -- asi ambos caminos garantizan el mismo guard atomico de
-- stock (si no alcanza, se revierte todo, la cotizacion se queda
-- "pendiente").

create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  cliente_nombre text not null,
  cliente_documento text,
  nota text,
  subtotal_gravado numeric(12, 2) not null default 0,
  subtotal_exento numeric(12, 2) not null default 0,
  itbms numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada')),
  venta_id uuid references ventas (id) on delete set null,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones (id) on delete cascade,
  tipo text not null check (tipo in ('nuevo', 'usado', 'servicio')),
  producto_id uuid references productos (id) on delete set null,
  servicio_id uuid references servicios (id) on delete set null,
  descripcion text not null,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  aplica_itbms boolean not null,
  subtotal numeric(12, 2) not null
);

alter table cotizaciones enable row level security;
alter table cotizacion_items enable row level security;

-- select para listar/ver; delete directo permitido (una cotizacion no
-- tiene efectos secundarios que deshacer, a diferencia de una venta) para
-- poder "rechazar"/cancelar una cotizacion sin necesitar una funcion
-- aparte. Insert/update SOLO a traves de las funciones de abajo, para
-- garantizar que el total/ITBMS se calculen siempre en el servidor.
grant select, delete on cotizaciones to authenticated;
grant select on cotizacion_items to authenticated;

create policy "usuarios con perfil ven cotizaciones" on cotizaciones
  for select using (auth_tiene_perfil());

create policy "usuarios con perfil eliminan cotizaciones" on cotizaciones
  for delete using (auth_tiene_perfil());

create policy "usuarios con perfil ven items de cotizacion" on cotizacion_items
  for select using (auth_tiene_perfil());

-- Logica compartida de crear_venta (sin el chequeo de autorizacion, que
-- corre en los wrappers publicos crear_venta/confirmar_cotizacion).
create or replace function crear_venta_interna(
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
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto o servicio';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := v_item ->> 'tipo';
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
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

-- crear_venta ahora es un wrapper delgado sobre crear_venta_interna --
-- misma firma de antes, ningun cambio para quien ya la llama.
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
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  return crear_venta_interna(p_fecha, p_cliente_nombre, p_cliente_documento, p_nota, p_items);
end;
$$;

grant execute on function crear_venta(date, text, text, text, jsonb) to authenticated;

-- Crea una cotizacion: misma logica de calculo que crear_venta_interna,
-- pero SIN tocar el stock (es solo un estimado, no una venta real).
create or replace function crear_cotizacion(
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
  v_cotizacion_id uuid;
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
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La cotización debe tener al menos un producto o servicio';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := v_item ->> 'tipo';
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
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

  insert into cotizaciones (
    fecha, cliente_nombre, cliente_documento, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_nota, ''),
    v_subtotal_gravado, v_subtotal_exento, v_itbms, v_total, auth.uid()
  )
  returning id into v_cotizacion_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := v_item ->> 'tipo';
    v_cantidad := (v_item ->> 'cantidad')::numeric;
    v_precio := (v_item ->> 'precio_unitario')::numeric;
    v_aplica_itbms := v_tipo in ('nuevo', 'usado');
    v_item_subtotal := round(v_cantidad * v_precio, 2);

    insert into cotizacion_items (
      cotizacion_id, tipo, producto_id, servicio_id, descripcion,
      cantidad, precio_unitario, aplica_itbms, subtotal
    )
    values (
      v_cotizacion_id,
      v_tipo,
      nullif(v_item ->> 'producto_id', '')::uuid,
      nullif(v_item ->> 'servicio_id', '')::uuid,
      v_item ->> 'descripcion',
      v_cantidad,
      v_precio,
      v_aplica_itbms,
      v_item_subtotal
    );
  end loop;

  return v_cotizacion_id;
end;
$$;

grant execute on function crear_cotizacion(date, text, text, text, jsonb) to authenticated;

-- Confirma una cotizacion pendiente: crea la venta real (con el mismo
-- guard de stock atomico) a partir de sus items guardados, y marca la
-- cotizacion como "confirmada" con un link a esa venta. Si no hay stock
-- suficiente en este momento (pudo cambiar desde que se hizo la
-- cotizacion), no se crea nada y la cotizacion se queda "pendiente".
create or replace function confirmar_cotizacion(p_cotizacion_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  v_cot record;
  v_items jsonb;
  v_venta_id uuid;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select * into v_cot from cotizaciones where id = p_cotizacion_id;
  if not found then
    raise exception 'Cotización no encontrada';
  end if;
  if v_cot.estado <> 'pendiente' then
    raise exception 'Esta cotización ya fue confirmada';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'tipo', tipo,
      'producto_id', producto_id,
      'servicio_id', servicio_id,
      'descripcion', descripcion,
      'cantidad', cantidad,
      'precio_unitario', precio_unitario
    )),
    '[]'::jsonb
  )
  into v_items
  from cotizacion_items
  where cotizacion_id = p_cotizacion_id;

  v_venta_id := crear_venta_interna(
    v_cot.fecha, v_cot.cliente_nombre, v_cot.cliente_documento, v_cot.nota, v_items
  );

  update cotizaciones set estado = 'confirmada', venta_id = v_venta_id where id = p_cotizacion_id;

  return v_venta_id;
end;
$$;

grant execute on function confirmar_cotizacion(uuid) to authenticated;
