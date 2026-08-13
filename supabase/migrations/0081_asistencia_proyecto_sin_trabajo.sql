-- Agro Sky — migración 0081: "Proyecto — no se pudo trabajar" en Asistencia
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-13): si el equipo de Campo va a trabajar un
-- día de Proyecto pero no se puede regar por lluvia, falla mecánica, etc.,
-- hoy no queda ningún registro de ese día -- el Informe de Campo exige al
-- menos una parcela con hectáreas > 0 (es un documento formal firmado por
-- el cliente, no se puede guardar en blanco), y Asistencia ya no acepta
-- "Proyecto" como tipo de trabajo nuevo desde que el Informe de Campo pasó
-- a ser la única fuente de asistencia de Proyecto (ver migraciones 0044 en
-- adelante). El colaborador queda sin asistencia y sin pago ese día pese a
-- haber ido a trabajar.
--
-- Nuevo valor de tipo_trabajo: 'sin_trabajo'. Reutiliza las columnas que
-- ya existen en esta tabla desde el viejo flujo de Asistencia-Proyecto
-- (rol_dia, jornada, tipo_proyecto, descripcion como motivo) -- no hace
-- falta agregar columnas nuevas. A diferencia del histórico 'proyecto'
-- (que forzaba jornada='proyecto' como placeholder, de antes de que
-- existiera el concepto de medio día), 'sin_trabajo' SÍ usa jornada real
-- ('completo'/'medio') para poder calcular el salario base correcto -- ver
-- calcularPagoProyecto() en lib/calculoIncentivos.ts, llamado con
-- hectareas=0 (el salario base ya cubre el día sin excedente).

alter table planilla_asistencia drop constraint planilla_asistencia_tipo_trabajo_check;
alter table planilla_asistencia add constraint planilla_asistencia_tipo_trabajo_check
  check (tipo_trabajo in ('proyecto', 'oficina', 'sin_trabajo'));
