-- Agro Sky — migracion 0028: Compras (Solicitudes -> Ordenes -> Recepcion)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Flujo: el administrador arma una Solicitud de Compra (lista de productos
-- ya existentes en Inventario + cuanto hace falta reponer). El jefe (o
-- soporte) la aprueba -- se convierte en una Orden de Compra real,
-- exportable a PDF para el proveedor -- o la rechaza. El administrador NO
-- puede aprobar/rechazar (se valida con auth_gestiona_usuarios(), la misma
-- funcion que ya restringe la gestion de Usuarios). Cuando llega la
-- mercancia, cualquiera de los 3 roles confirma la recepcion de la orden
-- (todo o nada, no hay recepcion parcial) y eso suma automaticamente la
-- cantidad de cada renglon al inventario.
--
-- No se maneja precio/costo en ningun momento de este flujo -- es
-- deliberado, el usuario nunca lo pidio. El PDF de la orden es solo una
-- lista de codigo/descripcion/cantidad para el proveedor.
--
-- Mismo patron que Ventas/Cotizaciones: crear/aprobar/rechazar/recibir
-- pasan siempre por funciones de Postgres (nunca insert/update directo),
-- para que el guard de stock y las reglas de quien puede aprobar no se
-- puedan saltar. Solo eliminar (mientras este "pendiente") es un delete
-- directo via RLS, igual que las cotizaciones.

create table ordenes_compra (
  id uuid primary key default gen_random_uuid(),
  numero_orden integer generated always as identity,
  fecha date not null,
  proveedor_nombre text not null,
  proveedor_contacto text,
  estado text not null default 'pendiente_recepcion' check (estado in ('pendiente_recepcion', 'recibida')),
  recibida_en timestamptz,
  recibida_por uuid references perfiles (id),
  aprobada_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table orden_compra_items (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references ordenes_compra (id) on delete cascade,
  producto_id uuid references productos (id) on delete set null,
  tipo text not null check (tipo in ('nuevo', 'usado')),
  numero_parte text not null,
  descripcion text not null,
  cantidad integer not null check (cantidad > 0)
);

create table solicitudes_compra (
  id uuid primary key default gen_random_uuid(),
  numero_solicitud integer generated always as identity,
  fecha date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  nota text,
  motivo_rechazo text,
  orden_id uuid references ordenes_compra (id) on delete set null,
  creado_por uuid references perfiles (id),
  decidido_por uuid references perfiles (id),
  decidido_en timestamptz,
  creado_en timestamptz not null default now()
);

create table solicitud_compra_items (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references solicitudes_compra (id) on delete cascade,
  producto_id uuid references productos (id) on delete set null,
  tipo text not null check (tipo in ('nuevo', 'usado')),
  numero_parte text not null,
  descripcion text not null,
  cantidad_actual integer not null,
  cantidad_solicitada integer not null check (cantidad_solicitada > 0)
);

alter table ordenes_compra enable row level security;
alter table orden_compra_items enable row level security;
alter table solicitudes_compra enable row level security;
alter table solicitud_compra_items enable row level security;

-- select para listar/ver; delete directo permitido solo mientras no haya
-- pasado nada irreversible (solicitud "pendiente", orden sin recibir) --
-- insert/update SIEMPRE a traves de las funciones de abajo.
grant select, delete on solicitudes_compra to authenticated;
grant select on solicitud_compra_items to authenticated;
grant select, delete on ordenes_compra to authenticated;
grant select on orden_compra_items to authenticated;

create policy "usuarios con perfil ven solicitudes de compra" on solicitudes_compra
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil eliminan solicitudes pendientes" on solicitudes_compra
  for delete using (auth_tiene_perfil() and estado = 'pendiente');
create policy "usuarios con perfil ven items de solicitud" on solicitud_compra_items
  for select using (auth_tiene_perfil());

create policy "usuarios con perfil ven ordenes de compra" on ordenes_compra
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil eliminan ordenes sin recibir" on ordenes_compra
  for delete using (auth_tiene_perfil() and estado = 'pendiente_recepcion');
create policy "usuarios con perfil ven items de orden" on orden_compra_items
  for select using (auth_tiene_perfil());

-- Crea una solicitud de compra: por cada item busca el producto EN EL
-- SERVIDOR (tipo/numero_parte/descripcion/cantidad actuales) usando el
-- producto_id recibido -- nunca confia en texto que mande el cliente.
create function crear_solicitud_compra(
  p_fecha date,
  p_nota text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_solicitud_id uuid;
  v_item jsonb;
  v_producto record;
  v_cantidad_solicitada integer;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La solicitud debe tener al menos un producto';
  end if;

  insert into solicitudes_compra (fecha, nota, creado_por)
  values (p_fecha, nullif(p_nota, ''), auth.uid())
  returning id into v_solicitud_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select tipo, numero_parte, descripcion, cantidad into v_producto
    from productos
    where id = (v_item ->> 'producto_id')::uuid;

    if not found then
      raise exception 'Producto no encontrado';
    end if;

    v_cantidad_solicitada := (v_item ->> 'cantidad_solicitada')::integer;
    if v_cantidad_solicitada <= 0 then
      raise exception 'La cantidad solicitada debe ser mayor a cero';
    end if;

    insert into solicitud_compra_items (
      solicitud_id, producto_id, tipo, numero_parte, descripcion, cantidad_actual, cantidad_solicitada
    )
    values (
      v_solicitud_id, (v_item ->> 'producto_id')::uuid, v_producto.tipo, v_producto.numero_parte,
      v_producto.descripcion, v_producto.cantidad, v_cantidad_solicitada
    );
  end loop;

  return v_solicitud_id;
end;
$$;

grant execute on function crear_solicitud_compra(date, text, jsonb) to authenticated;

-- Aprueba una solicitud pendiente: crea la orden de compra + copia sus
-- renglones (cantidad_solicitada -> cantidad), y marca la solicitud
-- "aprobada" con el link a esa orden. Solo jefe/soporte (auth_gestiona_
-- usuarios(), la misma funcion que ya protege Usuarios).
create function aprobar_solicitud_compra(
  p_solicitud_id uuid,
  p_proveedor_nombre text,
  p_proveedor_contacto text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sol record;
  v_orden_id uuid;
begin
  if not auth_gestiona_usuarios() then
    raise exception 'No autorizado';
  end if;

  select * into v_sol from solicitudes_compra where id = p_solicitud_id;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_sol.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue decidida';
  end if;

  if p_proveedor_nombre is null or trim(p_proveedor_nombre) = '' then
    raise exception 'El nombre del proveedor es requerido';
  end if;

  insert into ordenes_compra (fecha, proveedor_nombre, proveedor_contacto, aprobada_por)
  values (current_date, trim(p_proveedor_nombre), nullif(p_proveedor_contacto, ''), auth.uid())
  returning id into v_orden_id;

  insert into orden_compra_items (orden_id, producto_id, tipo, numero_parte, descripcion, cantidad)
  select v_orden_id, producto_id, tipo, numero_parte, descripcion, cantidad_solicitada
  from solicitud_compra_items
  where solicitud_id = p_solicitud_id;

  update solicitudes_compra
  set estado = 'aprobada', orden_id = v_orden_id, decidido_por = auth.uid(), decidido_en = now()
  where id = p_solicitud_id;

  return v_orden_id;
end;
$$;

grant execute on function aprobar_solicitud_compra(uuid, text, text) to authenticated;

-- Rechaza una solicitud pendiente. Mismo guard de rol que aprobar.
create function rechazar_solicitud_compra(
  p_solicitud_id uuid,
  p_motivo text
)
returns void
language plpgsql
security definer
as $$
declare
  v_sol record;
begin
  if not auth_gestiona_usuarios() then
    raise exception 'No autorizado';
  end if;

  select * into v_sol from solicitudes_compra where id = p_solicitud_id;
  if not found then
    raise exception 'Solicitud no encontrada';
  end if;
  if v_sol.estado <> 'pendiente' then
    raise exception 'Esta solicitud ya fue decidida';
  end if;

  update solicitudes_compra
  set estado = 'rechazada', motivo_rechazo = nullif(p_motivo, ''), decidido_por = auth.uid(), decidido_en = now()
  where id = p_solicitud_id;
end;
$$;

grant execute on function rechazar_solicitud_compra(uuid, text) to authenticated;

-- Confirma la recepcion de una orden (todo o nada): suma la cantidad de
-- cada renglon al inventario. Abierto a los 3 roles (el administrador
-- debe poder hacerlo). Salta renglones cuyo producto ya no existe
-- (producto_id quedo en null porque se borro el producto mientras tanto).
create function confirmar_recepcion_orden(p_orden_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_orden record;
  v_item record;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select * into v_orden from ordenes_compra where id = p_orden_id;
  if not found then
    raise exception 'Orden no encontrada';
  end if;
  if v_orden.estado <> 'pendiente_recepcion' then
    raise exception 'Esta orden ya fue recibida';
  end if;

  for v_item in
    select producto_id, cantidad
    from orden_compra_items
    where orden_id = p_orden_id and producto_id is not null
  loop
    update productos
    set cantidad = cantidad + v_item.cantidad
    where id = v_item.producto_id;
  end loop;

  update ordenes_compra
  set estado = 'recibida', recibida_en = now(), recibida_por = auth.uid()
  where id = p_orden_id;
end;
$$;

grant execute on function confirmar_recepcion_orden(uuid) to authenticated;
