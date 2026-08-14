-- Agro Sky — migración 0090: estado (Abierto/Cerrado) en el catálogo de Proyectos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-14): poder ver de un vistazo si un Proyecto
-- del catálogo (migración 0087) sigue activo o ya se cerró. Default
-- 'abierto' -- todo proyecto ya existente y cualquiera nuevo arranca
-- abierto, se cierra a mano desde la pantalla de Proyectos cuando
-- corresponda.
--
-- No confundir con la columna "estado" que existió en informes_campo
-- (Abierto/Cerrado multi-día) y que se revirtió/eliminó en la propia
-- migración 0087 -- es un concepto totalmente distinto, en una tabla
-- distinta.
alter table proyectos
  add column estado text not null default 'abierto' check (estado in ('abierto', 'cerrado'));
