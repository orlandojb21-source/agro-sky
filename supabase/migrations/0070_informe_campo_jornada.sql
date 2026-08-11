-- Agro Sky — migración 0070: Jornada (medio día / día completo) en Informe de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Hasta ahora el pago de Proyecto siempre asumía día completo (ver
-- src/lib/calculoIncentivos.ts). El usuario pidió poder marcar medio día
-- también en Proyecto -- un solo valor por informe (aplica a todo el
-- equipo, igual que ya pasa con hora de inicio/fin), y cuando es medio
-- día se divide entre 2 el monto que ya calculaba la fórmula de
-- base+hectáreas. Default 'completo' para no alterar ningún informe ya
-- existente (siempre se asumió día completo hasta hoy).
--
-- IMPORTANTE (misma lección de las migraciones 0061/0063/0064/0065):
-- el drop de las funciones debe coincidir EXACTAMENTE con la firma que
-- existe hoy en la base (post 0065) -- si no coincide, create function
-- deja una función sobrecargada duplicada en vez de reemplazarla.

alter table informes_campo
  add column jornada text not null default 'completo' check (jornada in ('completo', 'medio'));

drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb
);
drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb
);

-- p_jornada va al final con default 'completo' -- Postgres exige que los
-- parámetros con default vayan después de los que no lo tienen, y así
-- cualquier llamada existente que todavía no lo mande (ej. mientras se
-- despliega) sigue funcionando exactamente igual que antes.
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
  v_imagen text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  insert into informes_campo (
    cliente, fecha, finca, hora_inicio, hora_fin, meteorologia, tipo_aplicacion, modelo_drone,
    dosis_por_hectarea, tipo_proyecto, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    jornada, registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_tipo_aplicacion, p_modelo_drone,
    p_dosis_por_hectarea, p_tipo_proyecto, p_operador, coalesce(p_ayudantes, '{}'),
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

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (v_informe_id, v_imagen);
  end loop;

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
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

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (p_informe_id, v_imagen);
  end loop;
end;
$$;

grant execute on function editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
) to authenticated;
