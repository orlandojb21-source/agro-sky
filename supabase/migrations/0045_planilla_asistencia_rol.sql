-- Agro Sky — migracion 0045: rol del dia (Operador/Ayudante) en Asistencia
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-07-31): al registrar asistencia, ademas del tipo
-- de trabajo y la jornada, hay que marcar si ese dia la persona actuo como
-- Operador o Ayudante -- las tarifas de pago (tanto en Oficina como en
-- Proyecto, ver memoria de incentivos por hectarea) son distintas segun el
-- rol, y un mismo colaborador de Campo puede ser Operador un dia y Ayudante
-- otro (no es una propiedad fija del colaborador). Aplica siempre, sin
-- importar el tipo de trabajo -- no solo en Proyecto.
--
-- Tabla sin filas todavia (verificado antes de escribir esta migracion), asi
-- que se puede agregar como "not null" directo sin backfill.

alter table planilla_asistencia add column rol_dia text not null check (rol_dia in ('operador', 'ayudante'));
