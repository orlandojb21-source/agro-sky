-- Agro Sky — migración 0082: agregar tipo_proyecto a planilla_asistencia (faltaba)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- La migración 0048_planilla_asistencia_tipo_proyecto.sql agregaba esta
-- columna, pero al verificar contra producción (2026-08-13, mientras se
-- construía "Proyecto — no se pudo trabajar", migración 0081) resultó que
-- nunca se había corrido -- probablemente porque el flujo de Asistencia-
-- Proyecto que la necesitaba se reemplazó por Informe de Campo (migración
-- 0044 en adelante) antes de que alguien llegara a ejecutar la 0048. Esta
-- migración la agrega ahora, ya que "sin_trabajo" (migración 0081) sí la
-- necesita. "if not exists"/"if exists" por si en algún ambiente sí llegó
-- a aplicarse parcialmente.

alter table planilla_asistencia add column if not exists tipo_proyecto text;

alter table planilla_asistencia drop constraint if exists planilla_asistencia_tipo_proyecto_check;
alter table planilla_asistencia add constraint planilla_asistencia_tipo_proyecto_check
  check (tipo_proyecto in ('ingenio_santa_rosa', 'particular'));
