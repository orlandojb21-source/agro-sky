-- Agro Sky — migración 0059: nuevos roles "gerente" y "rrhh_contabilidad"
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Rediseño de roles pedido por el usuario (2026-08-04): 2 roles nuevos,
-- ambos con partes de "solo lectura" -- un concepto nuevo que se aplica
-- del lado de la app (SECTION_ACCESS en src/lib/roles.ts + requireWrite()
-- en src/lib/session.ts), no acá. Esta migración solo permite que los
-- nuevos valores existan en perfiles.rol. 'jefe' y 'soporte' NO cambian de
-- valor (solo se renombran en la UI, a "Gerente General"/"Soporte IT") --
-- cero riesgo de migrar cuentas existentes.
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('administrador', 'jefe', 'soporte', 'campo', 'gerente', 'rrhh_contabilidad'));
