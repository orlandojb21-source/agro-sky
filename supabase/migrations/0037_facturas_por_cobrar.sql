-- Agro Sky — migracion 0037: facturas por cobrar (estado de pago + vencimiento)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Algunos clientes no pagan la factura al momento -- la venta queda
-- registrada pero el cobro se hace despues. Se agrega un estado de pago
-- por venta ('pagada' | 'pendiente'), elegido al crear la venta (o al
-- confirmar una cotizacion como venta). Si queda 'pendiente' se pide una
-- fecha de vencimiento, para poder distinguir "pendiente" de "vencida" en
-- la lista y en el aviso de facturas por cobrar. Cuando el cliente paga,
-- se marca la venta como cobrada (marcar_venta_cobrada), lo que registra
-- fecha_cobro + quien la cobro.
--
-- Esto es exclusivo de ventas reales -- las cotizaciones no tienen estado
-- de pago (no son facturas todavia).
--
-- Como crear_venta_interna/crear_venta/confirmar_cotizacion cambian su
-- lista de parametros, hay que borrarlas primero (create or replace no
-- alcanza cuando cambia la lista de parametros).

alter table ventas add column estado_pago text not null default 'pagada' check (estado_pago in ('pagada', 'pendiente'));
alter table ventas add column fecha_vencimiento date;
alter table ventas add column fecha_cobro date;
alter table ventas add column cobrada_por uuid references perfiles (id);

-- Una venta 'pendiente' siempre debe tener fecha de vencimiento. Al marcarla
-- 'pagada' despues, la fecha de vencimiento no se borra (queda como dato
-- historico), simplemente deja de ser obligatoria.
alter table ventas add constraint ventas_vencimiento_si_pendiente
  check (estado_pago = 'pagada' or fecha_vencimiento is not null);

drop function if exists crear_venta_interna(date, text, text, text, text, text, text, text, text, jsonb);
drop function if exists crear_venta(date, text, text, text, text, text, text, text, text, jsonb);
drop function if exists confirmar_cotizacion(uuid);

create function crear_venta_interna(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_ruc text,
  p_cliente_ruc_dv text,
  p_cliente_telefono text,
  p_cliente_direccion text,
  p_cliente_correo text,
  p_nota text,
  p_estado_pago text,
  p_fecha_vencimiento date,
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

  if p_estado_pago not in ('pagada', 'pendiente') then
    raise exception 'Estado de pago invalido';
  end if;

  if p_estado_pago = 'pendiente' and p_fecha_vencimiento is null then
    raise exception 'Falta la fecha de vencimiento para una venta por cobrar';
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
    fecha, cliente_nombre, cliente_documento, cliente_ruc, cliente_ruc_dv,
    cliente_telefono, cliente_direccion, cliente_correo, nota,
    estado_pago, fecha_vencimiento,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_cliente_ruc, ''), nullif(p_cliente_ruc_dv, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_cliente_correo, ''), nullif(p_nota, ''),
    p_estado_pago, p_fecha_vencimiento,
    v_subtotal_gravado, v_subtotal_exento, v_itbms, v_total, auth.uid()
  )
  returning id into v_venta_id;

  -- Guarda/actualiza el cliente en el registro reutilizable -- solo con
  -- ventas reales (nunca con cotizaciones, pedido explicito del usuario).
  -- Si ya existia (mismo nombre), completa los campos que llegaron esta vez
  -- sin borrar los que ya se sabian y esta vez no se volvieron a escribir.
  insert into clientes (nombre, cedula, ruc, ruc_dv, telefono, direccion, correo)
  values (
    p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_cliente_ruc, ''), nullif(p_cliente_ruc_dv, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_cliente_correo, '')
  )
  on conflict (nombre) do update set
    cedula = coalesce(excluded.cedula, clientes.cedula),
    ruc = coalesce(excluded.ruc, clientes.ruc),
    ruc_dv = coalesce(excluded.ruc_dv, clientes.ruc_dv),
    telefono = coalesce(excluded.telefono, clientes.telefono),
    direccion = coalesce(excluded.direccion, clientes.direccion),
    correo = coalesce(excluded.correo, clientes.correo),
    actualizado_en = now();

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
  p_cliente_ruc text,
  p_cliente_ruc_dv text,
  p_cliente_telefono text,
  p_cliente_direccion text,
  p_cliente_correo text,
  p_nota text,
  p_estado_pago text,
  p_fecha_vencimiento date,
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
    p_fecha, p_cliente_nombre, p_cliente_documento, p_cliente_ruc, p_cliente_ruc_dv,
    p_cliente_telefono, p_cliente_direccion, p_cliente_correo, p_nota,
    p_estado_pago, p_fecha_vencimiento, p_items
  );
end;
$$;

grant execute on function crear_venta(date, text, text, text, text, text, text, text, text, text, date, jsonb) to authenticated;

-- Misma idea que antes, ahora recibe tambien el estado de pago elegido al
-- confirmar (una cotizacion no tiene estado de pago propio -- se decide en
-- este paso, no antes).
create function confirmar_cotizacion(
  p_cotizacion_id uuid,
  p_estado_pago text,
  p_fecha_vencimiento date
)
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
    v_cot.fecha, v_cot.cliente_nombre, v_cot.cliente_documento, v_cot.cliente_ruc, v_cot.cliente_ruc_dv,
    v_cot.cliente_telefono, v_cot.cliente_direccion, v_cot.cliente_correo, v_cot.nota,
    p_estado_pago, p_fecha_vencimiento, v_items
  );

  update cotizaciones set estado = 'confirmada', venta_id = v_venta_id where id = p_cotizacion_id;

  return v_venta_id;
end;
$$;

grant execute on function confirmar_cotizacion(uuid, text, date) to authenticated;

-- Marca una venta 'pendiente' como cobrada. No requiere jefe/soporte --
-- cualquiera de los 3 roles administra Ventas con normalidad hoy, y cobrar
-- una factura es una operacion de rutina, igual que confirmar_recepcion_orden
-- en Compras.
create function marcar_venta_cobrada(p_venta_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_estado text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select estado_pago into v_estado from ventas where id = p_venta_id;
  if not found then
    raise exception 'Venta no encontrada';
  end if;
  if v_estado = 'pagada' then
    raise exception 'Esta factura ya está pagada';
  end if;

  update ventas
  set estado_pago = 'pagada', fecha_cobro = current_date, cobrada_por = auth.uid()
  where id = p_venta_id;
end;
$$;

grant execute on function marcar_venta_cobrada(uuid) to authenticated;
