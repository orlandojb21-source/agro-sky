-- Agro Sky — migración 0087: catálogo de Proyectos + Clientes administrables
-- + revertir Informe de Campo "Abierto/Cerrado" (migración 0085)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-14):
-- 1) "Informes" pasa a llamarse "Proyectos" en el menú (solo la etiqueta,
--    las rutas /informes/* no cambian).
-- 2) Nueva pantalla "Proyectos" (crear/listar) y nueva pantalla "Clientes"
--    (CRUD completo, hoy no existe ninguna).
-- 3) Un Proyecto se crea amarrado a un código autogenerado + un Cliente ya
--    existente (se elige de un <select>, sin quick-add inline).
-- 4) TODO Informe de Campo (incluido Ingenio Santa Rosa, hoy una
--    clasificación fija) debe elegir un Proyecto ya creado -- ya no se
--    escribe "cliente" a mano ni se elige "tipo_proyecto" suelto.
-- 5) Se revierte por completo la función "Abierto/Cerrado multi-día" que
--    se agregó ayer (migración 0085) -- confirmado que hoy no existe
--    ningún informe real con estado='abierto', revert 100% seguro. El
--    problema que esa función intentaba resolver (proyecto particular de
--    varios días, con equipo distinto cada día) se resuelve ahora
--    creando VARIOS Informes de Campo (uno por día, simples) ligados al
--    mismo Proyecto -- no con un informe que crece día a día.
--
-- Diseño de bajo impacto (decisión del usuario, ver comentario en
-- informes_campo más abajo): se agrega proyecto_id a informes_campo pero
-- se SIGUEN llenando cliente/tipo_proyecto como antes (copiados del
-- Proyecto elegido, ahora no editables a mano) -- así ningún código
-- existente que lee informe.cliente/informe.tipo_proyecto (PDF, cálculo
-- de pago, listado, detalle) se rompe. proyecto_id queda listo para
-- cuando se retome "Análisis de Proyecto lee Informes de Campo de un
-- Proyecto" (fuera de alcance por ahora, pedido explícito del usuario).

-- =========================================================================
-- PARTE A — Clientes: de "solo lectura + autocompletado por Venta" a
-- pantalla CRUD propia. La tabla y su policy de lectura ya existen
-- (migración 0035) -- solo se amplían los grants/policies para
-- insert/update/delete directo (mismo patrón que "colaboradores",
-- migración 0024: RLS "for all" simple, sin RPC).
-- =========================================================================

grant insert, update, delete on clientes to authenticated;

create policy "usuarios con perfil administran clientes" on clientes
  for insert with check (auth_tiene_perfil());
create policy "usuarios con perfil actualizan clientes" on clientes
  for update using (auth_tiene_perfil()) with check (auth_tiene_perfil());
create policy "usuarios con perfil eliminan clientes" on clientes
  for delete using (auth_tiene_perfil());

-- =========================================================================
-- PARTE B — Proyectos: catálogo nuevo, amarrado a Cliente. Código
-- autogenerado con el MISMO patrón de 0025_codigos_automaticos.sql
-- (secuencia + trigger BEFORE INSERT, solo rellena si llega vacío).
-- =========================================================================

create sequence proyectos_codigo_seq start 1;

create table proyectos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  cliente_id uuid not null references clientes (id),
  -- Mismo check que informes_campo.tipo_proyecto hoy (migración 0050) --
  -- fijo por proyecto, no se espera que cambie una vez creado (si algún
  -- día hace falta reclasificar, se edita el Proyecto, nunca el informe).
  tipo_proyecto text not null check (tipo_proyecto in ('ingenio_santa_rosa', 'particular')),
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create function generar_codigo_proyecto()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or trim(new.codigo) = '' then
    new.codigo := 'ASPP-' || lpad(nextval('proyectos_codigo_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_generar_codigo_proyecto
before insert on proyectos
for each row execute function generar_codigo_proyecto();

alter table proyectos enable row level security;

grant select, insert, update, delete on proyectos to authenticated;

-- "for all" simple, igual que colaboradores/servicios -- la restricción
-- más angosta (Campo no gestiona Proyectos/Clientes, solo los lee para
-- elegirlos al crear un Informe de Campo) vive en la Server Action, no
-- acá, mismo criterio que editar/eliminar Informe de Campo.
create policy "usuarios con perfil administran proyectos" on proyectos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- =========================================================================
-- PARTE C — informes_campo.proyecto_id (nullable por ahora -- se pone
-- NOT NULL en la Parte E, después del backfill).
-- =========================================================================

alter table informes_campo add column proyecto_id uuid references proyectos (id);

-- =========================================================================
-- PARTE D — Backfill: un Proyecto por cada combinación distinta de
-- (cliente, tipo_proyecto) ya existente en informes_campo, resolviendo/
-- creando el Cliente por nombre. Pre-chequeo en producción (2026-08-14):
--   select cliente, tipo_proyecto, count(*) from informes_campo
--   group by 1, 2 order by 1, 2;
-- dio un único resultado: 4 informes, todos ("Jorge Vergara", "particular")
-- -- sin variantes de texto, sin tipo_proyecto nulo, sin Ingenio Santa
-- Rosa todavía. Backfill de bajísimo riesgo en este caso puntual.
-- =========================================================================

-- D.1: asegura que cada "cliente" (texto) de informes_campo tenga una fila
-- en clientes (upsert por nombre, igual que crear_venta_interna).
insert into clientes (nombre)
select distinct cliente from informes_campo
on conflict (nombre) do nothing;

-- D.2: un Proyecto por cada (cliente, tipo_proyecto) distinto. "nombre"
-- del Proyecto arranca igual al nombre del cliente (única info histórica
-- disponible) -- editable después desde la pantalla de Proyectos.
insert into proyectos (nombre, cliente_id, tipo_proyecto)
select distinct
  ic.cliente,
  c.id,
  coalesce(ic.tipo_proyecto, 'particular')
from informes_campo ic
join clientes c on c.nombre = ic.cliente;

-- D.3: liga cada informe histórico a su Proyecto recién creado.
update informes_campo ic
set proyecto_id = p.id
from proyectos p
join clientes c on c.id = p.cliente_id
where c.nombre = ic.cliente
  and p.tipo_proyecto = coalesce(ic.tipo_proyecto, 'particular')
  and ic.proyecto_id is null;

-- =========================================================================
-- PARTE E — proyecto_id pasa a NOT NULL. Si esto falla, algún informe
-- quedó sin Proyecto asignado (revisar la Parte D antes de reintentar).
-- =========================================================================

alter table informes_campo alter column proyecto_id set not null;

-- =========================================================================
-- PARTE F — Revertir migración 0085 (Abierto/Cerrado multi-día). Se
-- dropean las funciones PRIMERO (referencian estado/informe_campo_dias),
-- después las columnas/tabla.
-- =========================================================================

drop function if exists agregar_dia_informe_campo(uuid, date, time, time, text, text, text[], jsonb);
drop function if exists cerrar_informe_campo(uuid, text, text, text, text);

drop function if exists crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text, text
);
drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
);

alter table informe_campo_parcelas drop column dia_id;
drop table if exists informe_campo_dias;
alter table informes_campo drop column estado;

-- =========================================================================
-- PARTE G — Recrear crear_informe_campo/editar_informe_campo con el
-- comportamiento de ANTES de 0085 (un informe = un día, firmas siempre
-- obligatorias, sin "abierto") + el nuevo p_proyecto_id.
-- eliminar_informe_campo NO se toca (no referencia estado en ningún punto).
-- =========================================================================

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
  v_imagen text;
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

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (v_informe_id, v_imagen);
  end loop;

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_campo(
  text, date, text, time, time, text, text, text, text, text, uuid, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
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

  for v_imagen in select * from jsonb_array_elements_text(coalesce(p_imagenes, '[]'::jsonb))
  loop
    insert into informe_campo_imagenes (informe_id, ruta) values (p_informe_id, v_imagen);
  end loop;
end;
$$;

grant execute on function editar_informe_campo(
  uuid, text, date, text, time, time, text, text, text, text, text, uuid, text, text[], text, text, text, text, jsonb, jsonb, jsonb, text
) to authenticated;
