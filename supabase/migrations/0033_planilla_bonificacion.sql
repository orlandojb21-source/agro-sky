-- Agro Sky — migracion 0033: bonificación para colaboradores Fijos (sin CSS/Seguro Educativo)
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Monto extra que se le puede pagar a un colaborador Fijo junto con su
-- salario, pero que NO forma parte de la base de calculo de CSS/Seguro
-- Educativo (esas 2 deducciones se siguen calculando solo sobre
-- planilla_pagos.monto, nunca sobre la bonificacion). Nullable, opcional,
-- solo se usa para colaboradores Fijos.

alter table planilla_pagos add column bonificacion numeric(12, 2) check (bonificacion is null or bonificacion >= 0);
