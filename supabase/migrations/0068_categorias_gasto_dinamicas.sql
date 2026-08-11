-- Agro Sky — migración 0068: Categorías de gasto auto-administrables
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Hasta ahora las categorías de gasto de Caja Menuda (caja_gastos.categoria)
-- y de Compras > Gastos (gastos.categoria) eran listas fijas en el código,
-- cada una protegida por una restricción "check" -- agregar una categoría
-- nueva siempre requería una migración (ver 0020/0021/0023). El usuario
-- pidió poder agregarlas él mismo desde el formulario. Esta tabla las
-- reemplaza por una lista administrable, sembrada con las categorías que
-- ya existían para no perder ninguna ni romper datos guardados.
--
-- "categoria" en caja_gastos y en gastos se queda como texto plano (no se
-- vuelve llave foránea) -- ningún sitio que ya lee/muestra ese valor como
-- string necesita cambiar. La validación de "es una categoría conocida"
-- pasa de la restricción check al servidor (contra esta tabla).

create table categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  contexto text not null check (contexto in ('caja_menuda', 'compras')),
  nombre text not null,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (contexto, nombre)
);

alter table categorias_gasto enable row level security;

grant select, insert on categorias_gasto to authenticated;

create policy "usuarios con perfil ven y agregan categorias de gasto" on categorias_gasto
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- Semilla: mismas categorías y mismo orden que hoy (src/lib/categorias.ts
-- para Caja Menuda, src/lib/validation/gastos.ts para Compras -- estas
-- últimas en minúsculas porque así están guardadas hoy en gastos.categoria,
-- para no romper CATEGORIA_GASTO_LABEL ni tener que migrar datos).
insert into categorias_gasto (contexto, nombre) values
  ('caja_menuda', 'Combustible'),
  ('caja_menuda', 'Viáticos'),
  ('caja_menuda', 'Insumos de Oficina'),
  ('caja_menuda', 'Insumos de Limpieza'),
  ('caja_menuda', 'Planilla'),
  ('caja_menuda', 'Taller'),
  ('caja_menuda', 'Alquiler'),
  ('caja_menuda', 'Generadores'),
  ('caja_menuda', 'Comida Proyecto'),
  ('caja_menuda', 'Comida'),
  ('caja_menuda', 'Hielo'),
  ('caja_menuda', 'Bidones'),
  ('caja_menuda', 'Diésel'),
  ('caja_menuda', 'Combustible Extra'),
  ('caja_menuda', 'Gastos Extras'),
  ('caja_menuda', 'Otro'),
  ('compras', 'alquiler'),
  ('compras', 'luz'),
  ('compras', 'agua'),
  ('compras', 'internet'),
  ('compras', 'telefono'),
  ('compras', 'otro');

-- El desplegable de categoría ya no es una lista fija -- ahora sale de
-- categorias_gasto (arriba), así que la restricción de valores exactos ya
-- no aplica. planilla_pagos_categoria_check NO se toca (esa categoría
-- siempre es el literal 'Planilla', nunca la elige el usuario).
alter table caja_gastos drop constraint caja_gastos_categoria_check;
alter table gastos drop constraint gastos_categoria_check;
