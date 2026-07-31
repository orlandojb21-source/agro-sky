-- Agro Sky — migracion 0046: datos personales + foto para Colaboradores
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-07-31): al agregar un colaborador, ademas del
-- nombre, se pueden registrar cedula, correo, telefono, direccion y una
-- foto (tomada con la camara u subida desde archivo). Todos opcionales
-- (igual que el resto de datos de contacto en este esquema, ej.
-- perfiles.telefono) -- no bloquean el registro de un colaborador si
-- todavia no se tienen a mano.
--
-- La foto se guarda en Supabase Storage (decision del usuario, comparado
-- con integrar Google Drive: sin tramites de credenciales adicionales) en
-- un bucket PRIVADO -- foto_ruta guarda solo la ruta del objeto (no una
-- URL publica), y la app genera una URL firmada de corta duracion cada vez
-- que la muestra (ver colaboradores/page.tsx). Esto protege una foto
-- ligada a la cedula de una persona real, en vez de dejarla accesible para
-- siempre con un link que se pueda filtrar.

alter table colaboradores add column cedula text;
alter table colaboradores add column correo text;
alter table colaboradores add column telefono text;
alter table colaboradores add column direccion text;
alter table colaboradores add column foto_ruta text;

insert into storage.buckets (id, name, public) values ('colaboradores-fotos', 'colaboradores-fotos', false);

create policy "usuarios con perfil suben fotos de colaboradores" on storage.objects
  for insert
  with check (bucket_id = 'colaboradores-fotos' and auth_tiene_perfil());

create policy "usuarios con perfil ven fotos de colaboradores" on storage.objects
  for select
  using (bucket_id = 'colaboradores-fotos' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan fotos de colaboradores" on storage.objects
  for update
  using (bucket_id = 'colaboradores-fotos' and auth_tiene_perfil())
  with check (bucket_id = 'colaboradores-fotos' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan fotos de colaboradores" on storage.objects
  for delete
  using (bucket_id = 'colaboradores-fotos' and auth_tiene_perfil());
