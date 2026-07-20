-- Agro Sky — migracion 0009: Arqueo de caja (conteo fisico de efectivo)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Cada fila es una foto en el tiempo: cuanto efectivo se conto fisicamente
-- (detalle, cantidad por denominacion) y cual era el saldo esperado segun el
-- sistema en ese momento (saldo_esperado). A diferencia del saldo de la caja
-- (que siempre se recalcula, nunca se guarda), aqui SI se guarda el saldo
-- esperado y la diferencia, porque es un registro historico: el saldo
-- "en vivo" de hoy no debe cambiar lo que un arqueo de hace un mes decia.

create table caja_arqueos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  detalle jsonb not null,
  total_contado numeric(12, 2) not null check (total_contado >= 0),
  saldo_esperado numeric(12, 2) not null,
  diferencia numeric(12, 2) not null,
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table caja_arqueos enable row level security;

grant select, insert, update, delete on caja_arqueos to authenticated;

create policy "usuarios con perfil administran arqueos" on caja_arqueos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
