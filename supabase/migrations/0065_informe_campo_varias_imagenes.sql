-- Agro Sky — migracion 0065: varias imagenes por Informe de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-05): la imagen adjunta (migracion 0064,
-- una sola por informe) pasa a ser varias -- misma tabla hija que ya
-- usan Parcelas/Productos (una fila por elemento), no una sola columna.
-- Se migra cualquier imagen_ruta ya guardada a la tabla nueva antes de
-- borrar la columna, para no perder datos reales.

create table informe_campo_imagenes (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes_campo (id) on delete cascade,
  ruta text not null,
  creado_en timestamptz not null default now()
);

alter table informe_campo_imagenes enable row level security;

grant select on informe_campo_imagenes to authenticated;

create policy "usuarios con perfil ven imagenes de informes de campo" on informe_campo_imagenes
  for select using (auth_tiene_perfil());

insert into informe_campo_imagenes (informe_id, ruta)
select id, imagen_ruta from informes_campo where imagen_ruta is not null;

alter table informes_campo drop column imagen_ruta;

-- Recrear las 2 funciones: p_imagen_ruta text -> p_imagenes jsonb (array
-- de texto, ej. '["ruta1.jpg","ruta2.jpg"]'), mismo patron de
-- delete-e-reinsertar que ya usan Parcelas/Productos.
--
-- IMPORTANTE (leccion de las migraciones 0061/0063/0064): estas firmas
-- deben coincidir EXACTAMENTE con las que existen hoy en la base de
-- datos (post 0064: ya incluyen p_imagen_ruta text) -- si no coinciden,
-- el drop no borra nada y create function deja una funcion sobrecargada
-- duplicada en vez de reemplazarla.
drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, text, jsonb, jsonb
);
drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, text, jsonb, jsonb
);

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
  p_productos jsonb
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

  insert into informes_campo (
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, tipo_aplicacion, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_tipo_aplicacion, p_modelo_drone,
    p_dosis_por_hectarea, p_tipo_proyecto, p_operador, coalesce(p_ayudantes, '{}'),
    nullif(p_firma_agro_ruta, ''), nullif(p_nombre_firma_agro, ''),
    nullif(p_firma_cliente_ruta, ''), nullif(p_nombre_firma_cliente, ''),
    auth.uid()
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
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb
) to authenticated;

create function editar_informe_campo(
  p_informe_id uuid,
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
  p_productos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parcela jsonb;
  v_producto jsonb;
  v_imagen text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  update informes_campo
  set cliente = p_cliente,
      fecha = p_fecha,
      finca = p_finca,
      hora_inicio = p_hora_inicio,
      hora_fin = p_hora_fin,
      meteorologia = p_meteorologia,
      tipo_aplicacion = p_tipo_aplicacion,
      modelo_drone = p_modelo_drone,
      dosis_por_hectarea = p_dosis_por_hectarea,
      tipo_proyecto = p_tipo_proyecto,
      operador = p_operador,
      ayudantes = coalesce(p_ayudantes, '{}'),
      firma_agro_ruta = nullif(p_firma_agro_ruta, ''),
      nombre_firma_agro = nullif(p_nombre_firma_agro, ''),
      firma_cliente_ruta = nullif(p_firma_cliente_ruta, ''),
      nombre_firma_cliente = nullif(p_nombre_firma_cliente, '')
  where id = p_informe_id;

  if not found then
    raise exception 'Informe no encontrado';
  end if;

  delete from informe_campo_parcelas where informe_id = p_informe_id;
  delete from informe_campo_productos where informe_id = p_informe_id;
  delete from informe_campo_imagenes where informe_id = p_informe_id;

  for v_parcela in select * from jsonb_array_elements(coalesce(p_parcelas, '[]'::jsonb))
  loop
    insert into informe_campo_parcelas (informe_id, numero_parcela, hectareas)
    values (p_informe_id, v_parcela ->> 'numeroParcela', (v_parcela ->> 'hectareas')::numeric);
  end loop;

  for v_producto in select * from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb))
  loop
    insert into informe_campo_productos (informe_id, producto_activo, lts_por_hectarea)
    values (p_informe_id, v_producto ->> 'productoActivo', (v_producto ->> 'ltsPorHectarea')::numeric);
  end loop;

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (p_informe_id, v_imagen);
  end loop;
end;
$$;

grant execute on function editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb
) to authenticated;
