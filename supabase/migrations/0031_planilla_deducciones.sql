-- Agro Sky — migracion 0031: deducciones legales (CSS / Seguro Educativo) para colaboradores Fijos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Solo aplica a colaboradores Fijos (salario quincenal) -- CSS (Caja de
-- Seguro Social) y Seguro Educativo son las 2 deducciones que la ley de
-- Panama exige a un salario fijo. Se escriben a mano cada vez que se
-- registra el pago (no se calculan como porcentaje automatico del salario,
-- por pedido explicito del usuario), asi que quedan como columnas
-- nullable normales -- un pago de Campo simplemente nunca las llena.

alter table planilla_pagos add column css numeric(12, 2) check (css is null or css >= 0);
alter table planilla_pagos add column seguro_educativo numeric(12, 2) check (seguro_educativo is null or seguro_educativo >= 0);
