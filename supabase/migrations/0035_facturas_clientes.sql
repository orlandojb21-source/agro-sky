-- Agro Sky — migracion 0035: numeracion de facturas, RUC/DV/correo del cliente, registro de clientes
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- 1) La numeracion de facturas del sistema anterior del cliente llego hasta
--    la 36 -- esta app debe seguir desde la 37 en adelante (no reiniciar en
--    1). No hay ninguna venta real todavia en el sistema (verificado antes
--    de escribir esta migracion), asi que es seguro reiniciar el
--    correlativo sin dejar huecos ni chocar con nada.
--
-- 2) Se agregan RUC + DV (digito verificador) por separado de la Cedula, y
--    Correo electronico, tanto en ventas como en cotizaciones (comparten el
--    mismo formulario, y una cotizacion confirmada copia estos datos a la
--    venta que genera).
--
-- 3) Nueva tabla "clientes": cada vez que se crea una VENTA real (nunca con
--    una cotizacion sola, pedido explicito del usuario) se guarda/actualiza
--    el cliente por nombre -- asi el formulario puede sugerir clientes ya
--    conocidos y autocompletar sus datos la proxima vez. Solo lectura desde
--    la app (grant select) -- el guardado siempre pasa por crear_venta_interna,
--    nunca insert/update directo.
--
-- Como crear_venta_interna/crear_venta/crear_cotizacion cambian su lista de
-- parametros, hay que borrarlas primero (create or replace no alcanza
-- cuando cambia la lista de parametros).

alter table ventas alter column numero_factura restart with 37;

alter table ventas add column cliente_ruc text;
alter table ventas add column cliente_ruc_dv text;
alter table ventas add column cliente_correo text;

alter table cotizaciones add column cliente_ruc text;
alter table cotizaciones add column cliente_ruc_dv text;
alter table cotizaciones add column cliente_correo text;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  cedula text,
  ruc text,
  ruc_dv text,
  telefono text,
  direccion text,
  correo text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table clientes enable row level security;

grant select on clientes to authenticated;

create policy "usuarios con perfil ven clientes" on clientes
  for select using (auth_tiene_perfil());

drop function if exists crear_venta_interna(date, text, text, text, text, text, jsonb);
drop function if exists crear_venta(date, text, text, text, text, text, jsonb);
drop function if exists crear_cotizacion(date, text, text, text, text, text, jsonb);

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
    fecha, cliente_nombre, cliente_documento, cliente_ruc, cliente_ruc_dv,
    cliente_telefono, cliente_direccion, cliente_correo, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_cliente_ruc, ''), nullif(p_cliente_ruc_dv, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_cliente_correo, ''), nullif(p_nota, ''),
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
    p_cliente_telefono, p_cliente_direccion, p_cliente_correo, p_nota, p_items
  );
end;
$$;

grant execute on function crear_venta(date, text, text, text, text, text, text, text, text, jsonb) to authenticated;

create function crear_cotizacion(
  p_fecha date,
  p_cliente_nombre text,
  p_cliente_documento text,
  p_cliente_ruc text,
  p_cliente_ruc_dv text,
  p_cliente_telefono text,
  p_cliente_direccion text,
  p_cliente_correo text,
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
    fecha, cliente_nombre, cliente_documento, cliente_ruc, cliente_ruc_dv,
    cliente_telefono, cliente_direccion, cliente_correo, nota,
    subtotal_gravado, subtotal_exento, itbms, total, registrado_por
  )
  values (
    p_fecha, p_cliente_nombre, nullif(p_cliente_documento, ''), nullif(p_cliente_ruc, ''), nullif(p_cliente_ruc_dv, ''),
    nullif(p_cliente_telefono, ''), nullif(p_cliente_direccion, ''), nullif(p_cliente_correo, ''), nullif(p_nota, ''),
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

grant execute on function crear_cotizacion(date, text, text, text, text, text, text, text, text, jsonb) to authenticated;

-- Misma firma que antes (solo el id) -- create or replace alcanza. Ahora
-- pasa RUC/DV/correo de la cotizacion a crear_venta_interna, para que la
-- venta resultante (y el registro de clientes) queden completos.
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
    v_cot.fecha, v_cot.cliente_nombre, v_cot.cliente_documento, v_cot.cliente_ruc, v_cot.cliente_ruc_dv,
    v_cot.cliente_telefono, v_cot.cliente_direccion, v_cot.cliente_correo, v_cot.nota, v_items
  );

  update cotizaciones set estado = 'confirmada', venta_id = v_venta_id where id = p_cotizacion_id;

  return v_venta_id;
end;
$$;

grant execute on function confirmar_cotizacion(uuid) to authenticated;
