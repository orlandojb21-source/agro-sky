-- Agro Sky — migración 0085: Informe de Campo "Abierto" multi-día (solo Proyecto Particular)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-13): un Proyecto Particular puede durar más
-- de un día, con distintas hectáreas y a veces distinto operador cada
-- día. Hoy un Informe de Campo es de un solo día, con las 2 firmas
-- obligatorias para poder guardarlo -- no hay forma de ir cargando
-- trabajo de varios días bajo un mismo informe.
--
-- Diseño: se agrega "estado" (abierto/cerrado, default 'cerrado' para no
-- afectar ningún informe existente) a informes_campo. El informe en sí
-- sigue representando el PRIMER día de trabajo (fecha/operador/ayudantes/
-- hora_inicio/hora_fin/jornada del encabezado, exactamente como hoy) --
-- una tabla nueva, informe_campo_dias, guarda cualquier día ADICIONAL
-- (2do, 3er, etc.) con sus propios fecha/operador/ayudantes/horas.
-- informe_campo_parcelas gana una columna "dia_id" nullable: NULL = la
-- parcela es del primer día (el encabezado, como siempre), no-NULL = es
-- de uno de los días adicionales. Esto es deliberadamente NO invasivo:
-- todo informe existente (y todo informe de Ingenio Santa Rosa, que
-- nunca usa "abierto") sigue leyéndose exactamente igual que antes, sin
-- ningún cambio de comportamiento -- lo nuevo es 100% aditivo.
--
-- Solo un Proyecto Particular puede quedar "abierto" (Ingenio Santa Rosa
-- sigue siendo siempre de un solo día, firmas obligatorias al crear,
-- igual que hoy). Mientras está "abierto" NO hacen falta firmas para
-- guardar -- se piden recién al "cerrar" el informe (nueva función
-- cerrar_informe_campo), momento en el que ya no se pueden agregar más
-- días. Campo puede crear el informe (abierto o cerrado) y agregar días
-- mientras esté abierto (mismo criterio que hoy: Campo SÍ crea) -- cerrar
-- el informe, igual que editar/eliminar, queda para Administrador/
-- Gerente General/Soporte IT (el chequeo vive en la Server Action, no
-- acá, mismo patrón que el resto del proyecto).
--
-- IMPORTANTE (misma lección de las migraciones 0061/0063/0064/0065/0070):
-- el drop de las funciones debe coincidir EXACTAMENTE con la firma que
-- existe hoy en la base (post 0070) -- si no coincide, create function
-- deja una función sobrecargada duplicada en vez de reemplazarla.

alter table informes_campo
  add column estado text not null default 'cerrado' check (estado in ('abierto', 'cerrado'));

create table informe_campo_dias (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes_campo (id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  jornada text not null default 'completo' check (jornada in ('completo', 'medio')),
  operador text not null,
  ayudantes text[] not null default '{}',
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table informe_campo_parcelas
  add column dia_id uuid references informe_campo_dias (id) on delete cascade;

alter table informe_campo_dias enable row level security;

-- Solo lectura directa via PostgREST: insertar siempre pasa por
-- agregar_dia_informe_campo (mismo motivo que parcelas/productos).
grant select on informe_campo_dias to authenticated;

create policy "usuarios con perfil ven dias de informes de campo" on informe_campo_dias
  for select using (auth_tiene_perfil());

drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
);

-- p_estado va al final con default 'cerrado' -- cualquier llamada
-- existente que todavía no lo mande sigue creando un informe cerrado de
-- un solo día, exactamente como siempre.
create function crear_informe_campo(
  p_cliente text,
  p_fecha date,
  p_finca text,
  p_hora_inicio time,
  p_hora_fin time,
  p_meteorologia text,
  p_tipo_aplicacion text,
  p_modelo_drone text,
  p_dosis_por_hectarea text,
  p_tipo_proyecto text,
  p_operador text,
  p_ayudantes text[],
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text,
  p_imagenes jsonb,
  p_parcelas jsonb,
  p_productos jsonb,
  p_jornada text default 'completo',
  p_estado text default 'cerrado'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_informe_id uuid;
  v_parcela jsonb;
  v_producto jsonb;
  v_imagen text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if coalesce(p_estado, 'cerrado') = 'abierto' and p_tipo_proyecto <> 'particular' then
    raise exception 'Solo un informe de Proyecto Particular puede quedar Abierto';
  end if;

  insert into informes_campo (
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, tipo_aplicacion, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    jornada, estado, registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_tipo_aplicacion, p_modelo_drone,
    p_dosis_por_hectarea, p_tipo_proyecto, p_operador, coalesce(p_ayudantes, '{}'),
    nullif(p_firma_agro_ruta, ''), nullif(p_nombre_firma_agro, ''),
    nullif(p_firma_cliente_ruta, ''), nullif(p_nombre_firma_cliente, ''),
    coalesce(p_jornada, 'completo'), coalesce(p_estado, 'cerrado'), auth.uid()
  )
  returning id into v_informe_id;

  for v_parcela in select * from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb))
  loop
    insert into informe_campo_parcelas (informe_id, numero_parcela, hectareas)
    values (v_informe_id, v_parcela ->> 'numeroParcela', (v_parcela ->> 'hectareas')::numeric);
  end loop;

  for v_producto in select * from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb))
  loop
    insert into informe_campo_productos (informe_id, producto_activo, lts_por_hectarea)
    values (v_informe_id, v_producto ->> 'productoActivo', (v_producto ->> 'ltsPorHectarea')::numeric);
  end loop;

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (v_informe_id, v_imagen);
  end loop;

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text, text
) to authenticated;

-- Agrega un día adicional de trabajo a un informe Particular "abierto" --
-- inserta la fila en informe_campo_dias y sus parcelas (dia_id apuntando
-- a ese día). Rechaza si el informe no es Particular, ya está cerrado, o
-- no existe.
create function agregar_dia_informe_campo(
  p_informe_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_hora_fin time,
  p_jornada text,
  p_operador text,
  p_ayudantes text[],
  p_parcelas jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia_id uuid;
  v_tipo_proyecto text;
  v_estado text;
  v_parcela jsonb;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select tipo_proyecto, estado into v_tipo_proyecto, v_estado
  from informes_campo where id = p_informe_id for update;

  if v_tipo_proyecto is null then
    raise exception 'Informe no encontrado';
  end if;
  if v_tipo_proyecto <> 'particular' then
    raise exception 'Solo un informe de Proyecto Particular puede tener varios días';
  end if;
  if v_estado <> 'abierto' then
    raise exception 'Este informe ya está cerrado';
  end if;

  insert into informe_campo_dias (informe_id, fecha, hora_inicio, hora_fin, jornada, operador, ayudantes, registrado_por)
  values (p_informe_id, p_fecha, p_hora_inicio, p_hora_fin, coalesce(p_jornada, 'completo'), p_operador, coalesce(p_ayudantes, '{}'), auth.uid())
  returning id into v_dia_id;

  for v_parcela in select * from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb))
  loop
    insert into informe_campo_parcelas (informe_id, dia_id, numero_parcela, hectareas)
    values (p_informe_id, v_dia_id, v_parcela ->> 'numeroParcela', (v_parcela ->> 'hectareas')::numeric);
  end loop;

  return v_dia_id;
end;
$$;

grant execute on function agregar_dia_informe_campo(uuid, date, time, time, text, text, text[], jsonb) to authenticated;

-- Cierra un informe "abierto": guarda las 2 firmas y pasa estado a
-- 'cerrado'. Después de cerrado, agregar_dia_informe_campo ya no acepta
-- más días para ese informe (chequeo de arriba).
create function cerrar_informe_campo(
  p_informe_id uuid,
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  select estado into v_estado from informes_campo where id = p_informe_id for update;
  if v_estado is null then
    raise exception 'Informe no encontrado';
  end if;
  if v_estado = 'cerrado' then
    raise exception 'Este informe ya está cerrado';
  end if;
  if coalesce(p_firma_agro_ruta, '') = '' or coalesce(p_firma_cliente_ruta, '') = '' then
    raise exception 'Faltan las firmas para cerrar el informe';
  end if;

  update informes_campo
  set estado = 'cerrado',
      firma_agro_ruta = p_firma_agro_ruta,
      nombre_firma_agro = nullif(p_nombre_firma_agro, ''),
      firma_cliente_ruta = p_firma_cliente_ruta,
      nombre_firma_cliente = nullif(p_nombre_firma_cliente, '')
  where id = p_informe_id;
end;
$$;

grant execute on function cerrar_informe_campo(uuid, text, text, text, text) to authenticated;
