-- Agro Sky — migración 0056: Proveedores y Gastos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Dos tablas nuevas, planas (sin filas hijas, mismo patrón que
-- caja_gastos/informes_diarios -- insert/update/delete directo desde
-- Server Actions, no hace falta el patrón de funciones "security
-- definer" que sí usan Compras/Ventas porque ahí sí hay atomicidad de
-- header+items que proteger).
--
-- Gastos es para lo que NO es Caja Menuda (gastos operativos chicos del
-- día a día) ni compra de piezas de Inventario (eso ya lo cubre
-- Solicitudes/Órdenes de Compra): alquiler, luz, agua, internet,
-- teléfono, etc. -- los gastos fijos/operativos de la empresa como
-- negocio.

create table proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto text,
  telefono text,
  correo text,
  direccion text,
  ruc text,
  dv text,
  nota text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table gastos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  proveedor_id uuid references proveedores (id) on delete set null,
  categoria text not null check (
    categoria in ('alquiler', 'luz', 'agua', 'internet', 'telefono', 'otro')
  ),
  categoria_otro text,
  numero_factura text,
  monto numeric(12, 2) not null check (monto > 0),
  descripcion text,
  -- Ruta privada en el bucket "gastos-comprobantes" (no URL pública,
  -- mismo criterio que colaboradores.foto_ruta) -- foto/escaneo de la
  -- factura, opcional.
  comprobante_ruta text,
  registrado_por uuid references perfiles (id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table proveedores enable row level security;
alter table gastos enable row level security;

grant select, insert, update, delete on proveedores, gastos to authenticated;

-- Mismo criterio que Caja Menuda/Inventario: cualquier usuario con
-- perfil válido tiene acceso completo -- el control de acceso real es
-- que "compras" (SECTION_ACCESS en src/lib/roles.ts) ya excluye al rol
-- "campo", que es el único caso hoy con acceso recortado.
create policy "usuarios con perfil administran proveedores" on proveedores
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

create policy "usuarios con perfil administran gastos" on gastos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

-- Bucket privado para comprobantes de gastos -- mismo patrón exacto que
-- "colaboradores-fotos" (migración 0046): nunca una URL pública, siempre
-- URL firmada temporal generada en el servidor.
insert into storage.buckets (id, name, public) values ('gastos-comprobantes', 'gastos-comprobantes', false);

create policy "usuarios con perfil suben comprobantes de gastos" on storage.objects
  for insert
  with check (bucket_id = 'gastos-comprobantes' and auth_tiene_perfil());

create policy "usuarios con perfil ven comprobantes de gastos" on storage.objects
  for select
  using (bucket_id = 'gastos-comprobantes' and auth_tiene_perfil());

create policy "usuarios con perfil actualizan comprobantes de gastos" on storage.objects
  for update
  using (bucket_id = 'gastos-comprobantes' and auth_tiene_perfil())
  with check (bucket_id = 'gastos-comprobantes' and auth_tiene_perfil());

create policy "usuarios con perfil eliminan comprobantes de gastos" on storage.objects
  for delete
  using (bucket_id = 'gastos-comprobantes' and auth_tiene_perfil());
