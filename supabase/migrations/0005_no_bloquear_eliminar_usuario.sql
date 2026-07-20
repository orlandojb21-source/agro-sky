-- Agro Sky — migracion 0005: no bloquear eliminar un usuario que ya cargo productos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Bug encontrado en auditoria (2026-07-20): productos.creado_por/actualizado_por
-- referencian a perfiles(id) sin "on delete", que en Postgres por defecto es
-- "no action" — bloquea el delete. Confirmado con una prueba real: intentar
-- eliminar un usuario que ya habia creado un producto fallaba silenciosamente
-- (la app no mostraba error porque eliminarUsuarioAction no revisaba el
-- resultado, pero el usuario seguia existiendo). Se cambia a "set null": al
-- eliminar el usuario, sus productos quedan intactos, solo se pierde el
-- registro de quien los creo/edito.

alter table productos drop constraint if exists productos_creado_por_fkey;
alter table productos add constraint productos_creado_por_fkey
  foreign key (creado_por) references perfiles (id) on delete set null;

alter table productos drop constraint if exists productos_actualizado_por_fkey;
alter table productos add constraint productos_actualizado_por_fkey
  foreign key (actualizado_por) references perfiles (id) on delete set null;
