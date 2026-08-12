-- Agro Sky — migración 0079: estado del Drone (disponible / mantenimiento / etc)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Campo simple en Datos del Drone -- si está habilitado para trabajar o
-- no (en mantenimiento, reparación, esperando piezas, u otro motivo con
-- detalle libre). Default 'disponible' para no afectar los drones ya
-- registrados.

alter table drones
  add column estado text not null default 'disponible'
    check (estado in ('disponible', 'mantenimiento', 'reparacion', 'espera_piezas', 'otro')),
  add column estado_detalle text;
