-- Agro Sky — migración 0099: Décimo Tercer Mes
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Pedido del usuario (2026-08-15): José Luis Castillo es, por ahora, el
-- único colaborador Fijo al que se le paga Décimo Tercer Mes en las 3
-- partidas de ley (15 de abril / agosto / diciembre) -- ese monto lleva
-- descuento de CSS (9.75%) pero NO de Seguro Educativo (1.25%), a
-- diferencia del salario normal. Mismo patrón que aplica_deducciones
-- (migración 0032) y bonificacion (migración 0033): un campo por
-- colaborador para saber a quién sugerírselo, y una columna en
-- planilla_pagos para guardar el monto real de cada pago (siempre
-- editable a mano, nunca recalculado en el servidor).

alter table colaboradores add column aplica_decimo_tercer_mes boolean not null default false;

alter table planilla_pagos
  add column decimo_tercer_mes numeric(12, 2) check (decimo_tercer_mes is null or decimo_tercer_mes >= 0);
