-- Agro Sky — migracion 0062: corrige un error de la migracion 0061
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- La migracion 0061 (dosis_por_hectarea de numeric a texto) traia un
-- "drop function if exists editar_informe_campo(...)" con la firma vieja
-- incorrecta (le faltaba el parametro p_operador en la lista de tipos),
-- asi que el drop no encontro ninguna funcion que coincidiera y no borro
-- nada -- el "create function editar_informe_campo(...)" de esa misma
-- migracion termino creando una SEGUNDA funcion sobrecargada (con
-- p_dosis_por_hectarea text) en vez de reemplazar la vieja (con
-- p_dosis_por_hectarea numeric), que se quedo huerfana. Resultado: 2
-- versiones de editar_informe_campo al mismo tiempo, y cualquier llamada
-- real fallaba con "No se pudo elegir la mejor funcion candidata" (error
-- de Postgres al no poder decidir cual de las 2 usar).
--
-- Esta migracion borra unicamente la version vieja (numeric), que quedo
-- sin uso desde que el formulario ya no manda un numero. La version
-- nueva (text), creada correctamente en la 0061, no se toca.

drop function if exists editar_informe_campo(
  uuid, text, date, text, time, time, text, text, numeric, text, text, text[], text, text, text, text, jsonb, jsonb
);
