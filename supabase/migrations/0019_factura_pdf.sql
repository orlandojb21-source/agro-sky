-- Agro Sky — migracion 0019: datos para la factura en PDF (numero, cliente, codigo por linea)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Para poder imprimir la factura con el formato que pidio el cliente
-- (Factura No., datos del cliente con telefono/direccion, y una columna
-- de Codigo separada de la Descripcion en cada linea) hacen falta columnas
-- nuevas: un numero de factura correlativo en ventas (nunca en
-- cotizaciones -- una cotizacion no es una factura hasta que se confirma),
-- telefono/direccion del cliente en ventas Y cotizaciones (mismo
-- formulario para ambas), y "codigo" como columna propia en cada linea en
-- vez de venir pegado dentro de "descripcion".
--
-- Como cambian los parametros de crear_venta_interna/crear_venta/
-- crear_cotizacion, hay que borrarlas primero (create or replace no
-- alcanza cuando cambia la lista de parametros -- Postgres las trataria
-- como funciones distintas y dejaria la version vieja huerfana).

alter table ventas add column numero_factura integer generated always as identity;
alter table ventas add column cliente_telefono text;
alter table ventas add column cliente_direccion text;

alter table cotizaciones add column cliente_telefono text;
alter table cotizaciones add column cliente_direccion text;

alter table venta_items add column codigo text;
alter table cotizacion_items add column codigo text;

drop function if exists crear_venta_interna(date, text, text, text, jsonb);
drop function if exists crear_venta(date, text, text, text, jsonb);
drop function if exists crear_cotizacion(date, text, text, text, jsonb);

create function crear_venta_interna(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_telefono text,
  p_cliente_direccion text,
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
    fecha, cliente_nombre, cliente_documento, cliente_telefono, cliente_direccion, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_nota, ''),
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
      venta_id, tipo, producto_id, servicio_id, codigo, descripcion,
      cantidad, precio_unitario, aplica_itbms, subtotal
    )
    values (
      v_venta_id,
      v_tipo,
      nullif(v_item ->> 'producto_id', '')::uuid,
      nullif(v_item ->> 'servicio_id', '')::uuid,
      v_item ->> 'codigo',
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

create function crear_venta(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_telefono text,
  p_cliente_direccion text,
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

  return crear_venta_interna(
    p_fecha, p_cliente_nombre, p_cliente_documento, p_cliente_telefono, p_cliente_direccion,
    p_nota, p_items
  );
end;
$$;

grant execute on function crear_venta(date, text, text, text, text, text, jsonb) to authenticated;

create function crear_cotizacion(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_telefono text,
  p_cliente_direccion text,
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
    fecha, cliente_nombre, cliente_documento, cliente_telefono, cliente_direccion, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_nota, ''),
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
      cotizacion_id, tipo, producto_id, servicio_id, codigo, descripcion,
      cantidad, precio_unitario, aplica_itbms, subtotal
    )
    values (
      v_cotizacion_id,
      v_tipo,
      nullif(v_item ->> 'producto_id', '')::uuid,
      nullif(v_item ->> 'servicio_id', '')::uuid,
      v_item ->> 'codigo',
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

grant execute on function crear_cotizacion(date, text, text, text, text, text, jsonb) to authenticated;

-- confirmar_cotizacion mantiene la misma firma (solo el id) pero ahora
-- tiene que pasar telefono/direccion del cliente (guardados en la
-- cotizacion) a crear_venta_interna, y reconstruir "codigo" junto con el
-- resto del item al armar el jsonb desde cotizacion_items.
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
      'codigo', codigo,
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
    v_cot.fecha, v_cot.cliente_nombre, v_cot.cliente_documento,
    v_cot.cliente_telefono, v_cot.cliente_direccion, v_cot.nota, v_items
  );

  update cotizaciones set estado = 'confirmada', venta_id = v_venta_id where id = p_cotizacion_id;

  return v_venta_id;
end;
$$;

grant execute on function confirmar_cotizacion(uuid) to authenticated;
