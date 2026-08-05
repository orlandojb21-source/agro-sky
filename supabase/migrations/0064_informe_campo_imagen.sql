-- Agro Sky — migracion 0064: imagen adjunta opcional en Informe de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-05): boton para adjuntar una imagen en
-- Informe de Campo, opcional -- no debe bloquear guardar el informe.
-- Mismo patron ya usado para la captura del control del drone en
-- Informe Diario (migracion 0052): bucket privado propio + columna
-- nullable + limpieza best-effort del archivo viejo al reemplazar o
-- borrar el informe.

alter table informes_campo add column imagen_ruta text;

insert into storage.buckets (id, name, public)
values ('informes-campo-imagenes', 'informes-campo-imagenes', false);

create policy "usuarios con perfil suben imagenes de informes de campo" on storage.objects
  for insert
  with check (bucket_id = 'informes-campo-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil ven imagenes de informes de campo" on storage.objects
  for select
  using (bucket_id = 'informes-campo-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan imagenes de informes de campo" on storage.objects
  for update
  using (bucket_id = 'informes-campo-imagenes' and auth_tiene_perfil())
  with check (bucket_id = 'informes-campo-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan imagenes de informes de campo" on storage.objects
  for delete
  using (bucket_id = 'informes-campo-imagenes' and auth_tiene_perfil());

-- Recrear las 2 funciones con el parametro nuevo (drop obligatorio:
-- cambia la lista de parametros, "create or replace" no alcanza).
--
-- IMPORTANTE (leccion de las migraciones 0061/0063): estas firmas deben
-- coincidir EXACTAMENTE con las que existen hoy en la base de datos
-- (post 0063: ya incluyen p_tipo_aplicacion) -- si no coinciden, el
-- drop no borra nada y create function deja una funcion sobrecargada
-- duplicada en vez de reemplazarla.
drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb
);
drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb
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
  p_imagen_ruta text,
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
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  insert into informes_campo (
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, tipo_aplicacion, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    imagen_ruta, registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_tipo_aplicacion, p_modelo_drone,
    p_dosis_por_hectarea, p_tipo_proyecto, p_operador, coalesce(p_ayudantes, '{}'),
    nullif(p_firma_agro_ruta, ''), nullif(p_nombre_firma_agro, ''),
    nullif(p_firma_cliente_ruta, ''), nullif(p_nombre_firma_cliente, ''),
    nullif(p_imagen_ruta, ''), auth.uid()
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

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, text, jsonb, jsonb
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
  p_imagen_ruta text,
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
      nombre_firma_cliente = nullif(p_nombre_firma_cliente, ''),
      imagen_ruta = nullif(p_imagen_ruta, '')
  where id = p_informe_id;

  if not found then
    raise exception 'Informe no encontrado';
  end if;

  delete from informe_campo_parcelas where informe_id = p_informe_id;
  delete from informe_campo_productos where informe_id = p_informe_id;

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
end;
$$;

grant execute on function editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, text, jsonb, jsonb
) to authenticated;
