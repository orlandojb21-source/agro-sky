-- Agro Sky — migracion 0016: registro de pagos de Planilla
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Los 4 colaboradores (pagados por dia trabajado, sin cuenta de acceso a la
-- app) son una lista fija por ahora -- se valida con un check en vez de una
-- tabla aparte. Cada fila es un pago puntual: quien lo recibio, la fecha,
-- una descripcion y el monto (escrito a mano cada vez, no una tarifa fija,
-- porque el pago por dia puede variar). Guardar fecha+monto por fila es lo
-- que permite sumar por quincena/mes despues sin cambiar el esquema.

create table planilla_pagos (
  id uuid primary key default gen_random_uuid(),
  colaborador text not null check (
    colaborador in ('Rafael Monterrey', 'David Benavides', 'Alberto Villalaz', 'Julio Lobo')
  ),
  fecha date not null,
  descripcion text not null,
  monto numeric(12, 2) not null check (monto > 0),
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table planilla_pagos enable row level security;

grant select, insert, update, delete on planilla_pagos to authenticated;

-- Mismo criterio que Caja Menuda: cualquier usuario con perfil valido (los
-- 3 roles actuales) tiene acceso completo por ahora.
create policy "usuarios con perfil administran planilla" on planilla_pagos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
