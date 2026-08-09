-- Agro Sky — migración 0067: Préstamos a colaboradores
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Préstamos que la empresa hace a un colaborador (Fijo o Campo), con una
-- cuota quincenal sugerida a descontar en cada pago. Tabla plana, mismo
-- patrón que gastos/control_horario (sin RPC "security definer" -- no hay
-- atomicidad de header+items que proteger).
--
-- El saldo pendiente de un préstamo NO se guarda como columna -- se
-- calcula al vuelo sumando planilla_pagos.monto_prestamo de los pagos que
-- referencian ese préstamo (mismo principio que calcularTotalesMesActual()
-- en lib/planilla.ts: sumar sobre planilla_pagos en vez de mantener un
-- total guardado que se podría desincronizar al editar/borrar un pago).

create table prestamos (
  id uuid primary key default gen_random_uuid(),
  colaborador text not null,
  fecha date not null default current_date,
  monto numeric(12, 2) not null check (monto > 0),
  cuota_quincenal numeric(12, 2) not null check (cuota_quincenal > 0),
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table planilla_pagos
  add column prestamo_id uuid references prestamos (id) on delete set null,
  add column monto_prestamo numeric(12, 2) check (monto_prestamo is null or monto_prestamo > 0);

alter table prestamos enable row level security;

grant select, insert, update, delete on prestamos to authenticated;

-- Mismo criterio que Gastos/Control de Horario: cualquier usuario con
-- perfil válido administra préstamos -- el control de acceso real es
-- "planilla" en SECTION_ACCESS (src/lib/roles.ts).
create policy "usuarios con perfil administran prestamos" on prestamos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
