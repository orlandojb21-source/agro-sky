-- Agro Sky — migración 0055: nuevo rol "campo"
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Rol nuevo, deliberadamente acotado (pedido explícito del usuario,
-- 2026-08-03): un usuario con este rol solo debe poder entrar a Informe
-- de Campo (no Informe Diario, no Informe de Proyecto, no ninguna otra
-- sección). El resto de esa restricción vive en el código de la app
-- (SECTION_ACCESS en src/lib/roles.ts + los layouts de informes/diario e
-- informes/proyecto) -- esta migración solo permite que 'campo' sea un
-- valor válido en perfiles.rol. Ninguna política RLS ni función
-- security definer necesita cambios: todas las que aplican a
-- informes_campo (y su bucket de firmas) ya usan auth_tiene_perfil(),
-- que no distingue por rol -- solo exige que exista un perfil.
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('administrador', 'jefe', 'soporte', 'campo'));
