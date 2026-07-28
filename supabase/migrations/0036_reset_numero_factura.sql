-- Agro Sky — migracion 0036: reiniciar el correlativo de facturas a 37
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Las pruebas de la funcionalidad de facturas/clientes (migracion 0035) crearon
-- ventas reales de prueba tanto en local como en produccion, lo cual consumio
-- numeros de factura (37, 38, ... 42) del correlativo compartido. Todas esas
-- ventas de prueba ya fueron eliminadas, pero el correlativo (identity column)
-- no retrocede solo al borrar filas -- hay que reiniciarlo explicitamente para
-- que la PRIMERA factura real que se cree en el sistema salga con el numero 37,
-- como pidio el cliente (su sistema anterior llego hasta la 36).
--
-- Importante: no crear ninguna venta de prueba despues de correr esto -- eso
-- volveria a consumir el 37 y habria que repetir este reinicio.

alter table ventas alter column numero_factura restart with 37;
