-- Agro Sky — migración 0069: quitar "adjuntar imagen" de Informe Diario
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Ya no hace falta -- el Informe Diario se vincula a un Informe de Campo
-- (informe_campo_id, ver migración 0052), que ya tiene su propia foto/
-- imagen real (informe_campo_imagenes, migración 0065). Pedido explícito
-- del usuario: borrar por completo, incluidas las imágenes ya subidas.
--
-- IMPORTANTE: Supabase bloquea borrar una fila de storage.buckets con SQL
-- directo ("Direct deletion from storage tables is not allowed. Use the
-- Storage API instead.") -- por eso esta migración NO borra el bucket en
-- sí, solo la columna y las políticas. El bucket "informes-diarios-
-- capturas" (ya vacío, Claude lo vació con un script aparte usando la
-- service-role key) se borra por separado con la API de Storage.

alter table informes_diarios drop column imagen_control_ruta;

drop policy "usuarios con perfil suben capturas de informes diarios" on storage.objects;
drop policy "usuarios con perfil ven capturas de informes diarios" on storage.objects;
drop policy "usuarios con perfil actualizan capturas de informes diarios" on storage.objects;
drop policy "usuarios con perfil eliminan capturas de informes diarios" on storage.objects;
