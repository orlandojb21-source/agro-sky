-- Agro Sky — migracion 0026: numero de recibo en gastos de Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cuando el administrador entrega dinero a un colaborador, le da un recibo
-- fisico (papel) como acuse de recibido -- este campo guarda el numero de
-- ese recibo, solo como referencia (texto libre, no correlativo ni
-- validado por la app).

alter table caja_gastos add column numero_recibo text;
