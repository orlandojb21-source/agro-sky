-- Agro Sky — migracion 0008: Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Diseno: el saldo de la caja NUNCA se guarda en una columna aparte (evita que
-- se desincronice, mismo criterio que "Valor de Inventario" en productos). Se
-- calcula en la aplicacion como la suma de caja_reposiciones menos la suma de
-- caja_gastos. La primera reposicion registrada es el fondo inicial de $500.
-- caja_previstos es solo una referencia de presupuesto diario por colaborador
-- (no mueve el saldo); los gastos reales de ese colaborador se comparan contra
-- su previsto en la pantalla de Previstos.

create table caja_reposiciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  monto numeric(12, 2) not null check (monto > 0),
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table caja_previstos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  colaborador text not null,
  monto numeric(12, 2) not null check (monto > 0),
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (fecha, colaborador)
);

create table caja_gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  nombre text not null,
  concepto text not null,
  monto numeric(12, 2) not null check (monto > 0),
  colaborador text,
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table caja_reposiciones enable row level security;
alter table caja_previstos enable row level security;
alter table caja_gastos enable row level security;

grant select, insert, update, delete on caja_reposiciones, caja_previstos, caja_gastos to authenticated;

-- Mismo criterio que racks/contenedores/productos: cualquier usuario con
-- perfil valido (los 3 roles) tiene acceso completo a Caja Menuda.
create policy "usuarios con perfil administran reposiciones" on caja_reposiciones
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create policy "usuarios con perfil administran previstos" on caja_previstos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create policy "usuarios con perfil administran gastos" on caja_gastos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
