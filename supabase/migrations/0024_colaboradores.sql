-- Agro Sky — migracion 0024: tabla de Colaboradores administrable
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Los colaboradores de Planilla eran una lista fija de 4 nombres en el
-- codigo (validada con un check en planilla_pagos.colaborador). El usuario
-- pidio poder agregar colaboradores nuevos desde la app -- se pasa a una
-- tabla real. planilla_pagos.colaborador se queda como texto libre (sin FK):
-- si mas adelante se elimina un colaborador de esta tabla, los pagos ya
-- registrados con su nombre no se ven afectados (mismo criterio que
-- Servicios/Productos, cuyo nombre queda "fotografiado" en cada venta en
-- vez de depender de una relacion que se pueda romper).

create table colaboradores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  registrado_por uuid references perfiles (id),
  creado_en timestamptz not null default now()
);

alter table colaboradores enable row level security;

grant select, insert, update, delete on colaboradores to authenticated;

create policy "usuarios con perfil administran colaboradores" on colaboradores
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- Se siembran los 4 colaboradores que ya estaban en uso, para no perder
-- continuidad con los pagos ya registrados.
insert into colaboradores (nombre) values
  ('Rafael Monterrey'),
  ('David Benavides'),
  ('Alberto Villalaz'),
  ('Julio Lobo');

-- El colaborador de un pago ya no esta restringido a la lista fija de 4 --
-- ahora se elige desde la tabla colaboradores (que se puede ampliar), asi
-- que el check inline ya no aplica.
alter table planilla_pagos drop constraint planilla_pagos_colaborador_check;
