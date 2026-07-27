-- Agro Sky — migracion 0029: tipos de colaborador (Fijo/Campo) + clasificacion de pagos de Campo
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Fijo = colaborador con salario quincenal fijo (Ritela de Madriñán, Pedro
-- Madriñán, José L. Castillo, Juan C. Díaz). Campo = colaborador pagado por
-- dia, ya sea por Proyecto (manejo de drones) o en Taller (mantenimiento),
-- dia completo o medio dia (Rafael Monterrey, David Benavides, Alberto
-- Villalaz, Julio Polo). El monto de cada pago se sigue escribiendo a mano
-- en ambos casos (puede variar) -- tipo/tipo_trabajo/jornada son solo
-- clasificacion para reportes, no calculan ningun monto automaticamente.

alter table colaboradores add column tipo text not null default 'campo' check (tipo in ('fijo', 'campo'));

alter table planilla_pagos add column tipo_trabajo text check (tipo_trabajo in ('proyecto', 'taller'));
alter table planilla_pagos add column jornada text check (jornada in ('completo', 'medio'));

-- Corregir el nombre: es Julio Polo, no Julio Lobo (error de escritura
-- desde que se sembro la tabla colaboradores en la migracion 0024). No hay
-- pagos ni gastos de Caja Menuda registrados todavia a nombre de "Julio
-- Lobo", asi que renombrar el colaborador es suficiente.
update colaboradores set nombre = 'Julio Polo' where nombre = 'Julio Lobo';

-- Los 4 colaboradores ya existentes son los de Campo -- ya es el default de
-- la columna, esta linea es explicita por claridad y por si el default
-- cambia mas adelante.
update colaboradores set tipo = 'campo'
where nombre in ('Rafael Monterrey', 'David Benavides', 'Alberto Villalaz', 'Julio Polo');

insert into colaboradores (nombre, tipo) values
  ('Ritela de Madriñán', 'fijo'),
  ('Pedro Madriñán', 'fijo'),
  ('José L. Castillo', 'fijo'),
  ('Juan C. Díaz', 'fijo');
