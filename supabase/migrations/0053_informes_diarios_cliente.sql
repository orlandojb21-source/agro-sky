-- Agro Sky — migración 0053: corrige el "Nombre" del Informe Diario
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- La migración 0052 llamó "colaborador" al campo "Nombre" del Informe
-- Diario y lo autollenaba con el operador del Informe de Campo -- el
-- usuario aclaró que "Nombre" en realidad es el CLIENTE del Informe de
-- Campo (ej. "Ingenio Santa Rosa"), no quién voló el drone. Sin datos
-- reales todavía en esta tabla (se verificó antes de escribir esta
-- migración), así que renombrar la columna es seguro, sin backfill.
alter table informes_diarios rename column colaborador to cliente;
