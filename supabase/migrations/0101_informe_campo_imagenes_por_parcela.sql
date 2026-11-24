-- Agro Sky — migración 0101: imágenes de Informe de Campo asociadas a una parcela
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-11-24): un Informe de Campo puede tener N
-- parcelas, pero hasta ahora las imágenes adjuntas eran un solo montón
-- para todo el informe -- sin forma de saber a cuál parcela pertenece
-- cada una. Se agrega una etiqueta de texto con el número de parcela.
--
-- Por qué texto y no una referencia (FK) a informe_campo_parcelas.id:
-- editar_informe_campo borra y vuelve a insertar TODAS las parcelas en
-- cada edición (mismo patrón que productos), así que su id nunca es
-- estable entre ediciones -- igual que ya se hace en otras partes del
-- sistema (ver memoria de Planilla: Asistencia se liga a Informe de
-- Campo por nombre+fecha, no por FK), se identifica la parcela por su
-- "numero_parcela" (el mismo texto que ya se ve en pantalla), no por id.
--
-- Nullable a propósito: las imágenes ya guardadas antes de este cambio
-- no tienen parcela asignada y se quedan así (se muestran aparte, como
-- "generales", en vez de perderse o forzar una migración de datos que
-- nadie pidió).

alter table informe_campo_imagenes add column numero_parcela text;

-- Recrear las 2 funciones: p_imagenes pasa de jsonb array de texto
-- (["ruta1.jpg", ...]) a jsonb array de objeto
-- ([{"ruta": "...", "numeroParcela": "3" | null}, ...]). El tipo del
-- parámetro (jsonb) no cambia, así que "create or replace" alcanza --
-- no hace falta drop (a diferencia de cuando cambiaba la lista de
-- parámetros, ver migraciones 0061/0063/0064).

create or replace function crear_informe_campo(
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
  p_proyecto_id uuid,
  p_operador text,
  p_ayudantes text[],
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text,
  p_imagenes jsonb,
  p_parcelas jsonb,
  p_productos jsonb,
  p_jornada text default 'completo'
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
  v_imagen jsonb;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  insert into informes_campo (
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, tipo_aplicacion, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, proyecto_id, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    jornada, registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_tipo_aplicacion, p_modelo_drone,
    p_dosis_por_hectarea, p_tipo_proyecto, p_proyecto_id, p_operador, coalesce(p_ayudantes, '{}'),
    nullif(p_firma_agro_ruta, ''), nullif(p_nombre_firma_agro, ''),
    nullif(p_firma_cliente_ruta, ''), nullif(p_nombre_firma_cliente, ''),
    coalesce(p_jornada, 'completo'), auth.uid()
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

  for v_imagen in select * from jsonb_array_elements(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta, numero_parcela)
    values (v_informe_id, v_imagen ->> 'ruta', v_imagen ->> 'numeroParcela');
  end loop;

  return v_informe_id;
end;
$$;

create or replace function editar_informe_campo(
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
  p_proyecto_id uuid,
  p_operador text,
  p_ayudantes text[],
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text,
  p_imagenes jsonb,
  p_parcelas jsonb,
  p_productos jsonb,
  p_jornada text default 'completo'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parcela jsonb;
  v_producto jsonb;
  v_imagen jsonb;
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
      proyecto_id = p_proyecto_id,
      operador = p_operador,
      ayudantes = coalesce(p_ayudantes, '{}'),
      firma_agro_ruta = nullif(p_firma_agro_ruta, ''),
      nombre_firma_agro = nullif(p_nombre_firma_agro, ''),
      firma_cliente_ruta = nullif(p_firma_cliente_ruta, ''),
      nombre_firma_cliente = nullif(p_nombre_firma_cliente, ''),
      jornada = coalesce(p_jornada, 'completo')
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

  for v_imagen in select * from jsonb_array_elements(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta, numero_parcela)
    values (p_informe_id, v_imagen ->> 'ruta', v_imagen ->> 'numeroParcela');
  end loop;
end;
$$;
