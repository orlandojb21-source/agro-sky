-- Agro Sky — migracion 0025: codigo automatico para Nuevo/Usado/Servicios
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El cliente no tenia un sistema de codigos consistente en Inventario --
-- pidio generarlos automaticamente de aqui en adelante, con esta
-- nomenclatura: Nuevo = ASPN-0001, ASPU-0001 para Usado (4 digitos),
-- Servicios = ASPS-001 (3 digitos). Los productos/servicios YA existentes
-- no se tocan ni se renumeran -- esto solo aplica a lo que se cree de aqui
-- en adelante (cada secuencia arranca en 1, independiente de cualquier
-- numero_parte/nombre manual que ya exista).
--
-- Se implementa con un trigger BEFORE INSERT (no en la app) para que el
-- codigo se genere de forma atomica sin importar como llegue el insert, y
-- nunca se puedan pisar dos codigos por una condicion de carrera.

create sequence productos_nuevo_codigo_seq start 1;
create sequence productos_usado_codigo_seq start 1;
create sequence servicios_codigo_seq start 1;

create function generar_numero_parte_producto()
returns trigger
language plpgsql
as $$
begin
  if new.numero_parte is null or trim(new.numero_parte) = '' then
    if new.tipo = 'nuevo' then
      new.numero_parte := 'ASPN-' || lpad(nextval('productos_nuevo_codigo_seq')::text, 4, '0');
    elsif new.tipo = 'usado' then
      new.numero_parte := 'ASPU-' || lpad(nextval('productos_usado_codigo_seq')::text, 4, '0');
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_generar_numero_parte
before insert on productos
for each row execute function generar_numero_parte_producto();

create function generar_codigo_servicio()
returns trigger
language plpgsql
as $$
begin
  if new.nombre is null or trim(new.nombre) = '' then
    new.nombre := 'ASPS-' || lpad(nextval('servicios_codigo_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger trg_generar_codigo_servicio
before insert on servicios
for each row execute function generar_codigo_servicio();
