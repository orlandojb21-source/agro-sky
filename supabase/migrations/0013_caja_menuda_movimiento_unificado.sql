-- Agro Sky — migracion 0013: movimiento unificado en Caja Menuda
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- 1. caja_gastos pasa a representar cualquier movimiento de salida: un gasto
--    simple (nombre/concepto/monto) o una entrega de previsto/viaticos
--    (colaborador/previsto/entregado/vuelto) -- todos los campos son
--    opcionales, un movimiento se guarda con cualquier combinacion que se
--    haya llenado. caja_previstos desaparece (nunca tuvo datos reales).
-- 2. Los permisos de Caja Menuda vuelven a estar abiertos a los 3 roles
--    actuales (administrador, jefe, soporte) para todo: crear, editar,
--    eliminar. La restriccion de las migraciones 0010/0011 fue un
--    malentendido -- lo que el usuario quiere es que roles NUEVOS que
--    agregue en el futuro (aun no existen) queden excluidos, no los 3
--    roles de hoy. Cuando ese dia llegue, se ajustan las politicas de
--    nuevo con el nombre del rol nuevo.

alter table caja_gastos alter column nombre drop not null;
alter table caja_gastos alter column concepto drop not null;
alter table caja_gastos alter column monto drop not null;

alter table caja_gastos drop constraint caja_gastos_monto_check;
alter table caja_gastos add constraint caja_gastos_monto_check check (monto is null or monto > 0);

alter table caja_gastos add column previsto numeric(12, 2);
alter table caja_gastos add column entregado numeric(12, 2);
alter table caja_gastos add column vuelto numeric(12, 2);
alter table caja_gastos add constraint caja_gastos_previsto_check check (previsto is null or previsto > 0);
alter table caja_gastos add constraint caja_gastos_entregado_check check (entregado is null or entregado > 0);
alter table caja_gastos add constraint caja_gastos_vuelto_check check (vuelto is null or vuelto >= 0);

drop table caja_previstos;

drop policy "usuarios con perfil ven reposiciones" on caja_reposiciones;
drop policy "usuarios con perfil registran reposiciones" on caja_reposiciones;
drop policy "soporte y jefe actualizan reposiciones" on caja_reposiciones;
drop policy "soporte y jefe eliminan reposiciones" on caja_reposiciones;
create policy "usuarios con perfil administran reposiciones" on caja_reposiciones
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

drop policy "usuarios con perfil ven gastos" on caja_gastos;
drop policy "usuarios con perfil registran gastos" on caja_gastos;
drop policy "soporte y jefe actualizan gastos" on caja_gastos;
drop policy "soporte y jefe eliminan gastos" on caja_gastos;
create policy "usuarios con perfil administran gastos" on caja_gastos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());

drop policy "usuarios con perfil ven arqueos" on caja_arqueos;
drop policy "usuarios con perfil registran arqueos" on caja_arqueos;
drop policy "soporte y jefe actualizan arqueos" on caja_arqueos;
drop policy "soporte y jefe eliminan arqueos" on caja_arqueos;
create policy "usuarios con perfil administran arqueos" on caja_arqueos
  for all using (auth_tiene_perfil()) with check (auth_tiene_perfil());
