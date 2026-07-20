-- Agro Sky — migracion 0012: entregado y vuelto en previstos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- "monto" sigue siendo el previsto (lo planeado). "entregado" es el
-- efectivo que realmente sale de la caja al momento de entregarselo al
-- colaborador -- puede ser mayor al previsto si no hay cambio exacto
-- (ej: se necesitan $14 pero se entrega un billete de $20). "vuelto" es
-- el cambio que el colaborador devuelve al regresar (null mientras no se
-- ha registrado). Ambos mueven el saldo real de la caja (ver calcularSaldoActual).

alter table caja_previstos add column entregado numeric(12, 2);
alter table caja_previstos add column vuelto numeric(12, 2);

update caja_previstos set entregado = monto where entregado is null;

alter table caja_previstos alter column entregado set not null;
alter table caja_previstos add constraint caja_previstos_entregado_check check (entregado > 0);
alter table caja_previstos add constraint caja_previstos_vuelto_check check (vuelto is null or vuelto >= 0);
