-- Agro Sky — migracion 0030: salario quincenal para colaboradores Fijos + roster actualizado
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El usuario pidio que los colaboradores Fijos tengan un salario quincenal
-- guardado -- se autocompleta al registrar su pago pero sigue siendo
-- editable en ese momento (ajustes, descuentos, etc.). Campo no cambia:
-- sigue sin tarifa guardada, el monto se escribe a mano.
--
-- De paso el usuario actualizo la lista real de Fijos: paso de 4 a 6
-- personas, con nombres completos y su salario real. Todavia no existe
-- ningun pago registrado en el sistema (verificado antes de escribir esta
-- migracion), asi que es seguro borrar los 4 fijos anteriores y sembrar la
-- lista nueva completa en vez de tratar de emparejar nombres a mano.

alter table colaboradores add column salario numeric(12, 2) check (salario is null or salario > 0);

delete from colaboradores where tipo = 'fijo';

insert into colaboradores (nombre, tipo, salario) values
  ('José Luis Castillo', 'fijo', 800),
  ('Juan Carlos Díaz', 'fijo', 500),
  ('Pedro Madriñán', 'fijo', 500),
  ('Edgar Espinoza', 'fijo', 500),
  ('Ritela Madriñán', 'fijo', 200),
  ('Daysi Ruiz', 'fijo', 100);
