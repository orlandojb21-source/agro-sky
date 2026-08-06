-- El salario de un colaborador Fijo se guarda como monto MENSUAL (no
-- quincenal como se asumía al principio) -- el cálculo de cada quincena
-- (mitad del mensual) vive en la aplicación, no en la base de datos. Este
-- cambio corrige esa confusión, encontrada por el usuario 2026-08-06 al ver
-- que "Calcular pago sugerido" mostraba el mensual completo como si fuera
-- quincenal.
--
-- Además, algunos colaboradores Fijos tienen una bonificación mensual fija
-- que NUNCA lleva descuento de CSS/Seguro Educativo (a diferencia del
-- salario) -- hasta ahora no existía un campo separado para guardarla, así
-- que quedaba mezclada a mano dentro de "salario" (ej. José Luis Castillo:
-- 800 = 500 de salario + 300 de bonificación, los tres tomados como si
-- fueran un solo monto quincenal). Se separa en su propia columna,
-- espejando el patrón de "salario" (0030_planilla_salario_fijo.sql).
alter table colaboradores
  add column bonificacion numeric(12, 2) check (bonificacion is null or bonificacion >= 0);
