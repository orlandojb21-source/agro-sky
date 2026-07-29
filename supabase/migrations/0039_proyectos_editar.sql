-- Agro Sky — migracion 0039: editar informe de Proyectos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Actualiza el encabezado y reemplaza todas las filas del informe (se
-- borran las filas actuales y se insertan las nuevas, igual de simple que
-- reemplazar la lista completa desde el formulario) -- mismo principio que
-- crear_informe_proyecto: el total de cada fila siempre se recalcula en el
-- servidor, nunca se confia en lo que mande el cliente.

create function editar_informe_proyecto(
  p_informe_id uuid,
  p_proyecto text,
  p_ubicacion text,
  p_hectareas numeric,
  p_precio numeric,
  p_total numeric,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_filas jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_fila jsonb;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  update proyecto_informes
  set proyecto = p_proyecto,
      ubicacion = nullif(p_ubicacion, ''),
      hectareas = p_hectareas,
      precio = p_precio,
      total = p_total,
      fecha_desde = p_fecha_desde,
      fecha_hasta = p_fecha_hasta
  where id = p_informe_id;

  if not found then
    raise exception 'Informe no encontrado';
  end if;

  delete from proyecto_filas where informe_id = p_informe_id;

  for v_fila in select * from jsonb_array_elements(coalesce(p_filas, '[]'::jsonb))
  loop
    v_hectareas := coalesce((v_fila ->> 'hectareas')::numeric, 0);
    v_precio := coalesce((v_fila ->> 'precio')::numeric, 0);

    insert into proyecto_filas (informe_id, drone, hectareas, precio, total)
    values (p_informe_id, v_fila ->> 'drone', v_hectareas, v_precio, round(v_hectareas * v_precio, 2));
  end loop;
end;
$$;

grant execute on function editar_informe_proyecto(uuid, text, text, numeric, numeric, numeric, date, date, jsonb) to authenticated;
