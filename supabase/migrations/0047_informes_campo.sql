-- Agro Sky — migracion 0047: Informes de Campo (informe diario de vuelo)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Informe diario que llenan los trabajadores de campo por cada aplicacion
-- de producto (vuelo de drone) y se envia al cliente -- nueva seccion en
-- el menu, separada de Bitacora (mantenimiento) y de Proyectos (informe
-- semanal de facturacion). Las hectareas de este informe son la fuente de
-- datos para el calculo de incentivos por hectarea (ver memoria de
-- Planilla) -- antes se hablaba de esto como "Bitacora de Vuelo", es
-- literalmente este informe.
--
-- Mismo patron que Proyectos (migraciones 0038/0039/0042): header +
-- 2 tablas de detalle (parcelas, productos), crear/editar/eliminar
-- siempre pasan por funciones security definer, select directo abierto a
-- los 3 roles.

create table informes_campo (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  fecha date not null,
  finca text not null,
  hora_inicio time not null,
  hora_fin time not null,
  meteorologia text not null,
  modelo_drone text not null,
  dosis_por_hectarea numeric(12, 2) not null,
  operador text not null,
  ayudantes text[] not null default '{}',
  -- Rutas en el bucket privado "informes-campo-firmas" (no URLs publicas,
  -- mismo criterio que colaboradores.foto_ruta) + el nombre escrito junto
  -- a cada firma, para identificar quien firmo.
  firma_agro_ruta text,
  nombre_firma_agro text,
  firma_cliente_ruta text,
  nombre_firma_cliente text,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table informe_campo_parcelas (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes_campo (id) on delete cascade,
  numero_parcela text not null,
  hectareas numeric(12, 2) not null check (hectareas > 0)
);

create table informe_campo_productos (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references informes_campo (id) on delete cascade,
  producto_activo text not null,
  lts_por_hectarea numeric(12, 2) not null check (lts_por_hectarea > 0)
);

alter table informes_campo enable row level security;
alter table informe_campo_parcelas enable row level security;
alter table informe_campo_productos enable row level security;

-- Solo lectura directa via PostgREST: crear/editar/eliminar siempre pasan
-- por las funciones de abajo (mismo motivo que Proyectos).
grant select on informes_campo, informe_campo_parcelas, informe_campo_productos to authenticated;

create policy "usuarios con perfil ven informes de campo" on informes_campo
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven parcelas de informes de campo" on informe_campo_parcelas
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven productos de informes de campo" on informe_campo_productos
  for select using (auth_tiene_perfil());

-- p_parcelas: jsonb array de { "numeroParcela": text, "hectareas": numero }
-- p_productos: jsonb array de { "productoActivo": text, "ltsPorHectarea": numero }
create function crear_informe_campo(
  p_cliente text,
  p_fecha date,
  p_finca text,
  p_hora_inicio time,
  p_hora_fin time,
  p_meteorologia text,
  p_modelo_drone text,
  p_dosis_por_hectarea numeric,
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
    dosis_por_hectarea, operador, ayudantes,
    firma_agro_ruta, nombre_firma_agro, firma_cliente_ruta, nombre_firma_cliente,
    registrado_por
  )
  values (
    p_cliente, p_fecha, p_finca, p_hora_inicio, p_hora_fin, p_meteorologia, p_modelo_drone,
    p_dosis_por_hectarea, p_operador, coalesce(p_ayudantes, '{}'),
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
  text, date, text, time, time, text, text, numeric, text, text[], text, text, text, text, jsonb, jsonb
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
  uuid, text, date, text, time, time, text, text, numeric, text, text[], text, text, text, text, jsonb, jsonb
) to authenticated;

create function eliminar_informe_campo(p_informe_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  delete from informes_campo where id = p_informe_id;
end;
$$;

grant execute on function eliminar_informe_campo(uuid) to authenticated;

-- Bucket privado para las 2 firmas dibujadas por informe -- mismo criterio
-- que "colaboradores-fotos" en la migracion 0046 (URL firmada temporal
-- para mostrarla, nunca un link publico permanente).
insert into storage.buckets (id, name, public) values ('informes-campo-firmas', 'informes-campo-firmas', false);

create policy "usuarios con perfil suben firmas de informes de campo" on storage.objects
  for insert
  with check (bucket_id = 'informes-campo-firmas' and auth_tiene_perfil());

create policy "usuarios con perfil ven firmas de informes de campo" on storage.objects
  for select
  using (bucket_id = 'informes-campo-firmas' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan firmas de informes de campo" on storage.objects
  for update
  using (bucket_id = 'informes-campo-firmas' and auth_tiene_perfil())
  with check (bucket_id = 'informes-campo-firmas' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan firmas de informes de campo" on storage.objects
  for delete
  using (bucket_id = 'informes-campo-firmas' and auth_tiene_perfil());
