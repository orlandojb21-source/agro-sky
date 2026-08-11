-- Agro Sky — migración 0073: agregar N/S de la placa del FC a Datos del Drone
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Va justo después de N/S de la aeronave (pedido explícito del usuario) --
-- opcional, mismo criterio que los otros 2 números de serie.

alter table drones add column numero_serie_placa_fc text;
