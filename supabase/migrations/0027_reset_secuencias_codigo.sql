-- Agro Sky — migracion 0027: reiniciar las secuencias de codigo automatico
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Las pruebas locales y de produccion de la migracion 0025 (correlativos
-- ASPN/ASPU/ASPS) consumieron los primeros numeros de cada secuencia con
-- productos/servicios de prueba (ya borrados) -- local y produccion
-- comparten la misma base de datos de Supabase, asi que probar en
-- cualquiera de los dos ambientes avanza la secuencia real. Se reinician
-- a 1 para que el primer producto/servicio real del cliente arranque
-- limpio en ASPN-0001 / ASPU-0001 / ASPS-001. Seguro de correr: no existe
-- ningun producto/servicio real todavia con estos codigos.

alter sequence productos_nuevo_codigo_seq restart with 1;
alter sequence productos_usado_codigo_seq restart with 1;
alter sequence servicios_codigo_seq restart with 1;
