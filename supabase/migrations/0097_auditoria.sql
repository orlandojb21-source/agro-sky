-- Agro Sky — migración 0097: Auditoría de usuarios
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Registro de actividad de escritura (crear/editar/eliminar) por usuario,
-- capturado en un solo punto centralizado del código (requireWrite() en
-- src/lib/session.ts) en vez de instrumentar cada Server Action por
-- separado -- por eso guarda sección + quién + cuándo, no el detalle fino
-- de qué campo cambió. Visible solo para orlandojb.21@gmail.com, sin
-- importar el rol -- es el único correo autorizado a leer esta tabla
-- (auth.jwt() ->> 'email' se verifica del lado del servidor vía RLS, no
-- del rol en perfiles, para que no dependa de lo que la app mande).
--
-- Tabla de solo inserción: nadie puede editar ni borrar filas ya
-- guardadas (no hay policies de update/delete), para que sirva como
-- registro confiable.

create table auditoria_acciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfiles (id) on delete set null,
  usuario_nombre text not null,
  correo text not null,
  seccion text not null,
  creado_en timestamptz not null default now()
);

create index auditoria_acciones_creado_en_idx on auditoria_acciones (creado_en desc);

alter table auditoria_acciones enable row level security;

grant select, insert on auditoria_acciones to authenticated;

create policy "solo el correo autorizado lee la auditoria" on auditoria_acciones
  for select using ((auth.jwt() ->> 'email') = 'orlandojb.21@gmail.com');

create policy "un usuario con perfil registra sus propias acciones" on auditoria_acciones
  for insert with check (usuario_id = auth.uid());
