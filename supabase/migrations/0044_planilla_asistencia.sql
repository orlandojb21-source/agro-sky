-- Agro Sky — migracion 0044: Asistencia (Campo) separada de Pagos
-- Ejecutar una sola vez en Supabase, DESPUES de la 0043: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cambio de arquitectura pedido por el usuario (2026-07-31): los
-- colaboradores de Campo ya no se pagan dia por dia. El administrador
-- registra su asistencia dia por dia (sin monto, solo tipo de trabajo y
-- jornada). El jefe/soporte, al cierre de la quincena, mira esa
-- asistencia como referencia y escribe a mano UN pago total por
-- colaborador que cubre un rango de fechas (la quincena).
--
-- Los colaboradores Fijos no cambian en nada -- siguen con su pago
-- directo (salario/CSS/Seguro Educativo/Bonificacion), sin asistencia.
--
-- El administrador deja de ver/crear/editar/eliminar CUALQUIER pago (ni
-- Fijo ni Campo) -- eso pasa a ser exclusivo de jefe/soporte. Esto
-- revierte a proposito lo que decia la migracion 0034 ("todos los roles
-- siguen viendo toda la planilla"), por pedido explicito del usuario.

create table planilla_asistencia (
  id uuid primary key default gen_random_uuid(),
  colaborador text not null,
  fecha date not null,
  tipo_trabajo text not null check (tipo_trabajo in ('proyecto', 'oficina')),
  jornada text not null check (jornada in ('completo', 'medio', 'proyecto')),
  descripcion text not null,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table planilla_asistencia enable row level security;

grant select, insert, update, delete on planilla_asistencia to authenticated;

create policy "usuarios con perfil ven asistencia" on planilla_asistencia
  for select using (auth_tiene_perfil());

-- Asistencia solo aplica a colaboradores de Campo -- mismo criterio que ya
-- usa planilla_pagos en la migracion 0034 para restringir por tipo.
create policy "usuarios con perfil crean asistencia de Campo" on planilla_asistencia
  for insert
  with check (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_asistencia.colaborador and c.tipo = 'campo')
  );

create policy "usuarios con perfil editan asistencia de Campo" on planilla_asistencia
  for update
  using (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_asistencia.colaborador and c.tipo = 'campo')
  )
  with check (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_asistencia.colaborador and c.tipo = 'campo')
  );

create policy "usuarios con perfil eliminan asistencia de Campo" on planilla_asistencia
  for delete
  using (
    auth_tiene_perfil()
    and exists (select 1 from colaboradores c where c.nombre = planilla_asistencia.colaborador and c.tipo = 'campo')
  );

-- Pagos: ahora exclusivo de jefe/soporte. El administrador pierde el
-- select abierto y las 3 politicas que le permitian administrar pagos de
-- Campo (de la migracion 0034) -- las 3 politicas "jefe/soporte
-- crean/editan/eliminan cualquier pago" de esa misma migracion se quedan
-- vigentes, no se tocan.
drop policy "usuarios con perfil ven planilla" on planilla_pagos;
drop policy "usuarios con perfil crean pagos de Campo" on planilla_pagos;
drop policy "usuarios con perfil editan pagos de Campo" on planilla_pagos;
drop policy "usuarios con perfil eliminan pagos de Campo" on planilla_pagos;

create policy "jefe/soporte ven planilla" on planilla_pagos
  for select using (auth_gestiona_usuarios());

-- Un pago de Campo ahora cubre un rango (la quincena), no un solo dia.
-- Nullable: los pagos Fijos y los pagos historicos de Campo (dia por dia)
-- no lo usan.
alter table planilla_pagos add column fecha_desde date check (fecha_desde is null or fecha_desde <= fecha);
