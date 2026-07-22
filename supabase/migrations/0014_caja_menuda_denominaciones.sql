-- Agro Sky — migracion 0014: registrar movimientos de Caja Menuda por billete/moneda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- A partir de ahora, cada monto de dinero real en Caja Menuda (gasto,
-- reposicion, entregado, vuelto) se registra marcando cuantos billetes y
-- monedas de cada denominacion se usaron, igual que en el Arqueo -- no un
-- total en dolares escrito a mano. Las columnas numericas (monto,
-- entregado, vuelto) se mantienen: pasan a calcularse a partir del detalle
-- en vez de escribirse directo, para no tener que tocar el calculo del
-- saldo, los reportes ni los filtros que ya funcionan sobre esos numeros.
--
-- Nulas a proposito: los movimientos ya existentes (de antes de este
-- cambio) no tienen desglose por denominacion y se quedan asi -- la vista
-- previa del efectivo simplemente no los puede ajustar por billete, pero
-- su monto en dolares sigue contando igual para el saldo de la caja.

alter table caja_gastos add column monto_detalle jsonb;
alter table caja_gastos add column entregado_detalle jsonb;
alter table caja_gastos add column vuelto_detalle jsonb;

alter table caja_reposiciones add column monto_detalle jsonb;
