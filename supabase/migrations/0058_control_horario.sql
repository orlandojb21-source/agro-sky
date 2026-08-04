-- Agro Sky — migración 0058: Control de Horario (colaboradores Fijos)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Asistencia (planilla_asistencia) es específica de Campo: sus columnas
-- (rol_dia operador/ayudante, tipo_trabajo proyecto/oficina, jornada) le
-- dan de comer directo a la fórmula de pago por hectárea/día
-- (lib/calculoIncentivos.ts). No tiene sentido para un colaborador Fijo
-- con salario ya fijo (ej. José Luis Castillo, administrador, 2026-08-04)
-- -- lo que necesita ahí no es calcular un pago, sino verificar que
-- cumplió su horario (44h semanales: L-V 8am-5pm con 1h de almuerzo +
-- sábado 8am-12md). Por eso es una tabla nueva y simple, no una extensión
-- de planilla_asistencia.
create table control_horario (
  id uuid primary key default gen_random_uuid(),
  colaborador text not null,
  fecha date not null,
  cumplio boolean not null,
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (colaborador, fecha)
);

alter table control_horario enable row level security;

grant select, insert, update, delete on control_horario to authenticated;

create policy "usuarios con perfil administran control de horario" on control_horario
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
