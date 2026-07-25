-- Agro Sky — migracion 0022: Proyectos (informe semanal de costos por trabajo)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Reproduce el "Cuadro de analisis de gastos" semanal que el cliente ya
-- llenaba a mano en Excel, por proyecto (ej. un ingenio/finca). Cada
-- informe es independiente -- no hay un "proyecto padre" recurrente, cada
-- semana se llena uno nuevo desde cero. Estos montos NO son ventas/ingresos
-- reales de la empresa (no tocan Balance/Ventas); son solo un analisis
-- interno de costo/ganancia por trabajo, separado de Caja Menuda y
-- Planilla por pedido explicito del usuario.
--
-- Cada informe tiene 4 "operaciones" fijas (Drone 1, Drone 2, Drone 3,
-- Subcontratista). Cada operacion puede facturar a mas de una tarifa la
-- misma semana (tabla proyecto_tramos, hectareas x precio) y tiene sus
-- propios gastos operativos de la semana (7 categorias fijas, siempre las
-- mismas). Ademas hay un apendice de pago diario por persona
-- (proyecto_personal_dias) que NO entra en el calculo de ganancia -- es
-- solo detalle de respaldo (verificado contra los numeros reales del PDF
-- de referencia: los totales de gastos cuadran sin esta seccion).
--
-- Igual que Ventas/Cotizaciones: toda la escritura pasa por funciones de
-- Postgres (crear_informe_proyecto/eliminar_informe_proyecto) para que un
-- informe nunca quede guardado a medias si algo falla a mitad de camino.

create table proyecto_informes (
  id uuid primary key default gen_random_uuid(),
  proyecto text not null,
  ubicacion text,
  fecha_desde date not null,
  fecha_hasta date not null,
  precio_referencia numeric(12, 2),
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

create table proyecto_operaciones (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references proyecto_informes (id) on delete cascade,
  slot text not null check (slot in ('drone1', 'drone2', 'drone3', 'subcontratista')),
  operador text,
  diesel numeric(12, 2) not null default 0 check (diesel >= 0),
  gasolina numeric(12, 2) not null default 0 check (gasolina >= 0),
  viaticos numeric(12, 2) not null default 0 check (viaticos >= 0),
  planilla numeric(12, 2) not null default 0 check (planilla >= 0),
  alquiler_drone numeric(12, 2) not null default 0 check (alquiler_drone >= 0),
  alquiler_carro numeric(12, 2) not null default 0 check (alquiler_carro >= 0),
  lavado_carro numeric(12, 2) not null default 0 check (lavado_carro >= 0),
  unique (informe_id, slot)
);

create table proyecto_tramos (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references proyecto_operaciones (id) on delete cascade,
  hectareas numeric(12, 2) not null check (hectareas > 0),
  precio numeric(12, 2) not null check (precio >= 0),
  subtotal numeric(12, 2) not null
);

create table proyecto_personal_dias (
  id uuid primary key default gen_random_uuid(),
  informe_id uuid not null references proyecto_informes (id) on delete cascade,
  nombre text not null,
  rol text not null check (rol in ('Operador', 'Ayudante')),
  fecha date not null,
  monto numeric(12, 2) not null default 0 check (monto >= 0)
);

alter table proyecto_informes enable row level security;
alter table proyecto_operaciones enable row level security;
alter table proyecto_tramos enable row level security;
alter table proyecto_personal_dias enable row level security;

-- Solo lectura directa via PostgREST: crear/eliminar siempre pasa por las
-- funciones de abajo (mismo motivo que ventas: que el subtotal de cada
-- tramo se calcule siempre en el servidor, nunca confiando en el cliente).
grant select on proyecto_informes, proyecto_operaciones, proyecto_tramos, proyecto_personal_dias to authenticated;

create policy "usuarios con perfil ven informes de proyecto" on proyecto_informes
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven operaciones de proyecto" on proyecto_operaciones
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven tramos de proyecto" on proyecto_tramos
  for select using (auth_tiene_perfil());
create policy "usuarios con perfil ven personal de proyecto" on proyecto_personal_dias
  for select using (auth_tiene_perfil());

-- Crea un informe completo: encabezado + las 4 operaciones (con sus
-- tramos) + el personal por dia, todo en una sola funcion para que si algo
-- falla a mitad de camino, Postgres deshaga todo (no queda un informe a
-- medias).
--
-- p_operaciones: jsonb array de EXACTAMENTE 4 objetos
--   { "slot": "drone1"|"drone2"|"drone3"|"subcontratista",
--     "operador": text | null,
--     "diesel": numero, "gasolina": numero, "viaticos": numero,
--     "planilla": numero, "alquiler_drone": numero, "alquiler_carro": numero,
--     "lavado_carro": numero,
--     "tramos": [ { "hectareas": numero, "precio": numero }, ... ] }
-- p_personal: jsonb array de objetos
--   { "nombre": text, "rol": "Operador"|"Ayudante",
--     "dias": [ { "fecha": date, "monto": numero }, ... ] }
create function crear_informe_proyecto(
  p_proyecto text,
  p_ubicacion text,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_precio_referencia numeric,
  p_operaciones jsonb,
  p_personal jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_informe_id uuid;
  v_operacion jsonb;
  v_operacion_id uuid;
  v_tramo jsonb;
  v_persona jsonb;
  v_dia jsonb;
  v_hectareas numeric(12, 2);
  v_precio numeric(12, 2);
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  if p_operaciones is null or jsonb_array_length(p_operaciones) <> 4 then
    raise exception 'El informe debe tener exactamente las 4 operaciones (Drone 1, Drone 2, Drone 3, Subcontratista)';
  end if;

  insert into proyecto_informes (proyecto, ubicacion, fecha_desde, fecha_hasta, precio_referencia, registrado_por)
  values (p_proyecto, nullif(p_ubicacion, ''), p_fecha_desde, p_fecha_hasta, p_precio_referencia, auth.uid())
  returning id into v_informe_id;

  for v_operacion in select * from jsonb_array_elements(p_operaciones)
  loop
    insert into proyecto_operaciones (
      informe_id, slot, operador, diesel, gasolina, viaticos, planilla,
      alquiler_drone, alquiler_carro, lavado_carro
    )
    values (
      v_informe_id,
      v_operacion ->> 'slot',
      nullif(v_operacion ->> 'operador', ''),
      coalesce((v_operacion ->> 'diesel')::numeric, 0),
      coalesce((v_operacion ->> 'gasolina')::numeric, 0),
      coalesce((v_operacion ->> 'viaticos')::numeric, 0),
      coalesce((v_operacion ->> 'planilla')::numeric, 0),
      coalesce((v_operacion ->> 'alquiler_drone')::numeric, 0),
      coalesce((v_operacion ->> 'alquiler_carro')::numeric, 0),
      coalesce((v_operacion ->> 'lavado_carro')::numeric, 0)
    )
    returning id into v_operacion_id;

    for v_tramo in select * from jsonb_array_elements(coalesce(v_operacion -> 'tramos', '[]'::jsonb))
    loop
      v_hectareas := (v_tramo ->> 'hectareas')::numeric;
      v_precio := (v_tramo ->> 'precio')::numeric;
      insert into proyecto_tramos (operacion_id, hectareas, precio, subtotal)
      values (v_operacion_id, v_hectareas, v_precio, round(v_hectareas * v_precio, 2));
    end loop;
  end loop;

  for v_persona in select * from jsonb_array_elements(coalesce(p_personal, '[]'::jsonb))
  loop
    for v_dia in select * from jsonb_array_elements(coalesce(v_persona -> 'dias', '[]'::jsonb))
    loop
      insert into proyecto_personal_dias (informe_id, nombre, rol, fecha, monto)
      values (
        v_informe_id,
        v_persona ->> 'nombre',
        v_persona ->> 'rol',
        (v_dia ->> 'fecha')::date,
        coalesce((v_dia ->> 'monto')::numeric, 0)
      );
    end loop;
  end loop;

  return v_informe_id;
end;
$$;

grant execute on function crear_informe_proyecto(text, text, date, date, numeric, jsonb, jsonb) to authenticated;

create function eliminar_informe_proyecto(p_informe_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not auth_tiene_perfil() then
    raise exception 'No autorizado';
  end if;

  delete from proyecto_informes where id = p_informe_id;
end;
$$;

grant execute on function eliminar_informe_proyecto(uuid) to authenticated;
