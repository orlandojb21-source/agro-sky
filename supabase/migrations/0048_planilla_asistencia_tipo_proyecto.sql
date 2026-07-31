-- Agro Sky — migracion 0048: tipo de proyecto (Ingenio Santa Rosa / Trabajo Particular) en Asistencia
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-07-31): cuando el tipo de trabajo de un dia de
-- Asistencia es "Proyecto", tambien se marca si ese dia fue para "Ingenio
-- Santa Rosa" o "Trabajo Particular" -- las tarifas del calculo de
-- incentivos por hectarea son distintas para cada uno (ver
-- lib/calculoIncentivos.ts). Lista fija de 2 opciones por ahora, pedido
-- explicito del usuario -- si aparece otro cliente formal mas adelante se
-- amplia el check.
--
-- Nullable: solo aplica cuando tipo_trabajo = 'proyecto' (igual que
-- jornada no aplicaba a Fijo antes) -- se valida a nivel de app (zod), no
-- con un check cruzado entre columnas.

alter table planilla_asistencia add column tipo_proyecto text check (tipo_proyecto in ('ingenio_santa_rosa', 'particular'));
