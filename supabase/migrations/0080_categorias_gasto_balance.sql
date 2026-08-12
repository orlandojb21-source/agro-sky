-- Agro Sky — migración 0080: Categorías nuevas de Compras > Gastos para el cuadro de Balance
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- El nuevo cuadro de "Vista mensual de gastos" en Balance lee la lista de
-- categorías de categorias_gasto (contexto 'compras') dinámicamente -- no
-- hay nombres de categoría hardcodeados en el código. El usuario pidió
-- ver Celulares, Visa y Caja de Seguro Social como filas de ese cuadro;
-- como todavía no existían (solo existían alquiler/luz/agua/internet/
-- telefono/otro/Impuestos), se siembran aquí para que aparezcan de una
-- vez sin que el usuario tenga que darlas de alta a mano primero. "on
-- conflict do nothing" por si alguna ya fue agregada manualmente desde
-- la app antes de correr esta migración.
insert into categorias_gasto (contexto, nombre) values
  ('compras', 'Celulares'),
  ('compras', 'Visa'),
  ('compras', 'Caja de Seguro Social')
on conflict (contexto, nombre) do nothing;
