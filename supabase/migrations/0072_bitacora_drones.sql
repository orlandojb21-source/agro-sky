-- Agro Sky — migración 0072: Bitácora — Datos del Drone + historial de operador asignado
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Primer paso de la sección Bitácora (hasta ahora "en construcción"):
-- ficha de cada drone de la flota (identidad + registro de vuelo
-- acumulado, que el administrador actualiza a mano desde lo que reporta
-- el propio control del drone -- no se calcula solo desde Informe de
-- Campo). Más adelante se suman Bitácora de Mantenimiento y Bitácora de
-- Vuelo (por vuelo individual), que van a referenciar estos drones.
--
-- El operador asignado se puede reasignar las veces que haga falta, y el
-- usuario pidió explícitamente guardar el historial completo (no solo el
-- valor actual) -- por eso es una tabla aparte, no una columna en
-- "drones". "operador" es texto libre (nombre del colaborador), igual
-- que "colaborador" en planilla_pagos: si el colaborador se borra
-- después, el historial no se ve afectado.

create table drones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  modelo text not null,
  fecha_activacion date,
  numero_serie_aeronave text,
  numero_serie_fabrica text,
  -- Registro de Vuelo: totales acumulados que el administrador actualiza
  -- a mano (no se recalculan solos).
  area_cubierta numeric(12, 2) not null default 0,
  horas_vuelo numeric(12, 2) not null default 0,
  vuelos integer not null default 0,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table drones enable row level security;

grant select, insert, update, delete on drones to authenticated;

create policy "usuarios con perfil administran drones" on drones
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- Historial de operador asignado -- fecha_hasta null significa que esa
-- fila es la asignación vigente. Al reasignar, se cierra la fila vigente
-- (fecha_hasta = fecha del cambio) y se abre una nueva.
create table drones_operadores (
  id uuid primary key default gen_random_uuid(),
  drone_id uuid not null references drones (id) on delete cascade,
  operador text not null,
  fecha_desde date not null,
  fecha_hasta date,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table drones_operadores enable row level security;

grant select, insert, update, delete on drones_operadores to authenticated;

create policy "usuarios con perfil administran asignaciones de drones" on drones_operadores
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create index drones_operadores_drone_id_idx on drones_operadores (drone_id);
