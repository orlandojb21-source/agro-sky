-- Agro Sky — migración 0052: Informe Diario
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Documento informativo que arma el administrador (o jefe/soporte) para
-- enviarle al cliente qué se hizo ese día -- no tiene relación con el pago
-- de los trabajadores (eso sigue siendo Asistencia + Informe de Campo +
-- Pagos, sin cambios). Cada Informe Diario se vincula a UN Informe de
-- Campo real (elegido de una lista, no texto libre) -- de ahí saca "la
-- copia" que se adjunta al exportar el PDF. El unique en informe_campo_id
-- refuerza la regla confirmada por el usuario: si un operador voló para 2
-- clientes el mismo día (2 Informes de Campo separados), son 2 Informes
-- Diarios distintos, nunca uno que junte ambos.
--
-- Es una tabla simple (sin filas hijas que insertar en lote), así que no
-- necesita el patrón de funciones security definer que sí usan Proyectos /
-- Informe de Campo -- un insert/update directo desde el Server Action,
-- protegido por RLS, es suficiente (mismo criterio que planilla_pagos).

create table informes_diarios (
  id uuid primary key default gen_random_uuid(),
  informe_campo_id uuid not null unique references informes_campo (id) on delete cascade,
  colaborador text not null,
  fecha date not null,
  hectareas_aplicadas numeric(12, 2) not null check (hectareas_aplicadas > 0),
  tipo_aplicacion text not null,
  dosis text not null,
  boquillas text not null,
  altura_vuelo text not null,
  ancho_pases text not null,
  velocidad text not null,
  nota text,
  -- Ruta en el bucket privado "informes-diarios-capturas" -- captura de
  -- pantalla del control del drone que el operador le envía al
  -- administrador (por fuera de la app, ej. WhatsApp); el administrador la
  -- sube aquí manualmente.
  imagen_control_ruta text,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table informes_diarios enable row level security;

grant select, insert, update, delete on informes_diarios to authenticated;

-- Abierto a los 3 roles (administrador, jefe, soporte) -- confirmado por
-- el usuario, aunque en la práctica normalmente lo llena el administrador.
create policy "usuarios con perfil administran informes diarios" on informes_diarios
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

insert into storage.buckets (id, name, public)
values ('informes-diarios-capturas', 'informes-diarios-capturas', false);

create policy "usuarios con perfil suben capturas de informes diarios" on storage.objects
  for insert
  with check (bucket_id = 'informes-diarios-capturas' and auth_tiene_perfil());

create policy "usuarios con perfil ven capturas de informes diarios" on storage.objects
  for select
  using (bucket_id = 'informes-diarios-capturas' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan capturas de informes diarios" on storage.objects
  for update
  using (bucket_id = 'informes-diarios-capturas' and auth_tiene_perfil())
  with check (bucket_id = 'informes-diarios-capturas' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan capturas de informes diarios" on storage.objects
  for delete
  using (bucket_id = 'informes-diarios-capturas' and auth_tiene_perfil());
