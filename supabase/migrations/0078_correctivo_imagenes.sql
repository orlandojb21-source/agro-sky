-- Agro Sky — migración 0078: imágenes en Mantenimiento Correctivo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El gerente necesita ver el estado real de la pieza cambiada para
-- justificar si de verdad hacía falta el cambio -- se pueden adjuntar
-- varias fotos (distintas piezas o ángulos), mismo patrón que
-- informe_campo_imagenes (migración 0065): bucket privado, URL firmada
-- temporal para mostrarlas, nunca un link público.

create table drones_mantenimientos_correctivos_imagenes (
  id uuid primary key default gen_random_uuid(),
  correctivo_id uuid not null references drones_mantenimientos_correctivos (id) on delete cascade,
  ruta text not null,
  creado_en timestamptz not null default now()
);

alter table drones_mantenimientos_correctivos_imagenes enable row level security;

-- Solo lectura directa via PostgREST: se insertan solo desde
-- crear_mantenimiento_correctivo (junto con el resto del registro, de
-- forma atómica), igual que las piezas.
grant select on drones_mantenimientos_correctivos_imagenes to authenticated;

create policy "usuarios con perfil ven imagenes de mantenimientos correctivos" on drones_mantenimientos_correctivos_imagenes
  for select using (auth_tiene_perfil());

insert into storage.buckets (id, name, public)
values ('mantenimientos-correctivos-imagenes', 'mantenimientos-correctivos-imagenes', false);

create policy "usuarios con perfil suben imagenes de mantenimientos correctivos" on storage.objects
  for insert
  with check (bucket_id = 'mantenimientos-correctivos-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil ven imagenes de mantenimientos correctivos storage" on storage.objects
  for select
  using (bucket_id = 'mantenimientos-correctivos-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan imagenes de mantenimientos correctivos" on storage.objects
  for update
  using (bucket_id = 'mantenimientos-correctivos-imagenes' and auth_tiene_perfil())
  with check (bucket_id = 'mantenimientos-correctivos-imagenes' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan imagenes de mantenimientos correctivos" on storage.objects
  for delete
  using (bucket_id = 'mantenimientos-correctivos-imagenes' and auth_tiene_perfil());

-- Recrear crear_mantenimiento_correctivo con el parámetro nuevo --
-- p_imagenes va al final con default '[]' para no romper si algo todavía
-- no lo manda (misma razón que p_jornada en la migración 0070).
drop function if exists crear_mantenimiento_correctivo(uuid, date, text, jsonb);

create function crear_mantenimiento_correctivo(
  p_drone_id uuid,
  p_fecha date,
  p_motivo text,
  p_piezas jsonb,
  p_imagenes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correctivo_id uuid;
  v_pieza jsonb;
  v_producto_id uuid;
  v_cantidad integer;
  v_descripcion text;
  v_filas_afectadas int;
  v_imagen text;
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_piezas is null or jsonb_array_length(p_piezas) = 0 then
    raise exception 'El mantenimiento correctivo debe tener al menos una pieza';
  end if;

  insert into drones_mantenimientos_correctivos (drone_id, fecha, motivo, registrado_por)
  values (p_drone_id, p_fecha, p_motivo, auth.uid())
  returning id into v_correctivo_id;

  for v_pieza in select * from jsonb_array_elements(p_piezas)
  loop
    v_producto_id := (v_pieza ->> 'productoId')::uuid;
    v_cantidad := (v_pieza ->> 'cantidad')::integer;

    select descripcion into v_descripcion from productos where id = v_producto_id;
    if v_descripcion is null then
      raise exception 'Producto no encontrado en Inventario';
    end if;

    insert into drones_mantenimientos_correctivos_piezas (correctivo_id, producto_id, descripcion, cantidad)
    values (v_correctivo_id, v_producto_id, v_descripcion, v_cantidad);

    update productos
    set cantidad = cantidad - v_cantidad
    where id = v_producto_id
      and cantidad >= v_cantidad;

    get diagnostics v_filas_afectadas = row_count;
    if v_filas_afectadas = 0 then
      raise exception 'No hay stock suficiente para "%"', v_descripcion;
    end if;
  end loop;

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into drones_mantenimientos_correctivos_imagenes (correctivo_id, ruta) values (v_correctivo_id, v_imagen);
  end loop;

  return v_correctivo_id;
end;
$$;

grant execute on function crear_mantenimiento_correctivo(uuid, date, text, jsonb, jsonb) to authenticated;
