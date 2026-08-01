-- Agro Sky — migracion 0050: tipo de proyecto se muda de Asistencia a Informes de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Correccion del usuario (2026-08-01): cada Informe de Campo tiene su
-- propia contabilidad de hectareas -- si una persona trabaja en 2
-- proyectos distintos el mismo dia (2 informes), NUNCA se suman las
-- hectareas entre esos 2 informes. Cada uno se paga por separado, con su
-- propio "Ingenio Santa Rosa" o "Trabajo Particular". Por eso esta
-- clasificacion tiene que vivir en el Informe de Campo (junto con sus
-- hectareas), no en Asistencia (donde solo se podia elegir una vez por
-- dia, sin importar cuantos informes hubiera ese dia).
--
-- Hay 1 fila real ya guardada en informes_campo (verificado antes de
-- escribir esta migracion) -- queda sin clasificar (null) hasta que se
-- edite a mano; por eso la columna es nullable, no se intenta adivinar el
-- valor. planilla_asistencia tiene 2 filas reales con tipo_proyecto ya
-- guardado -- se pierden al quitar la columna, pero ningun pago ya
-- guardado dependia de ese valor (el calculo de Pagos siempre fue solo
-- una sugerencia editable).

alter table informes_campo add column tipo_proyecto text check (tipo_proyecto in ('ingenio_santa_rosa', 'particular'));

alter table planilla_asistencia drop column tipo_proyecto;

-- Recrear las 2 funciones con el nuevo parametro (drop obligatorio: cambia
-- la lista de parametros, "create or replace" no alcanza).
drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, numeric, text, text[], text, text, text, text, jsonb, jsonb
);
drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, numeric, text, text[], text, text, text, text, jsonb, jsonb
);

create function crear_informe_campo(
  p_cliente text,
  p_fecha date,
  p_finca text,
  p_hora_inicio time,
  p_hora_fin time,
  p_meteorologia text,
  p_modelo_drone text,
  p_dosis_por_hectarea numeric,
  p_tipo_proyecto text,
  p_operador text,
  p_ayudantes text[],
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text,
  p_parcelas jsonb,
  p_productos jsonb
)
returns uuid
language plpgsql
security definer
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
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_modelo_drone,
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

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_campo(
  text, date, text, time, time, text, text, numeric, text, text, text[], text, text, text, text, jsonb, jsonb
) to authenticated;

create function editar_informe_campo(
  p_informe_id uuid,
  p_cliente text,
  p_fecha date,
  p_finca text,
  p_hora_inicio time,
  p_hora_fin time,
  p_meteorologia text,
  p_modelo_drone text,
  p_dosis_por_hectarea numeric,
  p_tipo_proyecto text,
  p_operador text,
  p_ayudantes text[],
  p_firma_agro_ruta text,
  p_nombre_firma_agro text,
  p_firma_cliente_ruta text,
  p_nombre_firma_cliente text,
  p_parcelas jsonb,
  p_productos jsonb
)
returns void
language plpgsql
security definer
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
  uuid, text, date, text, time, time, text, text, numeric, text, text, text[], text, text, text, text, jsonb, jsonb
) to authenticated;
