-- Agro Sky — migracion 0032: marcar si un colaborador Fijo tiene deducciones legales
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- CSS y Seguro Educativo (9.75% / 1.25% del salario, confirmado por el
-- usuario) no aplican a TODOS los colaboradores Fijos -- depende de la
-- situacion legal de cada persona. Se guarda como una propiedad del
-- colaborador (igual que su salario), no del pago individual: al
-- registrar su pago, el formulario ya sabe si debe mostrar/calcular estas
-- 2 deducciones o no. Default true porque es la regla general; se ajusta
-- caso por caso desde /planilla/colaboradores.

alter table colaboradores add column aplica_deducciones boolean not null default true;
