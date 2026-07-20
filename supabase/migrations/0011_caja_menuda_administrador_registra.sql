-- Agro Sky — migracion 0011: corrige 0010, administrador SI registra movimientos
-- Ejecutar una sola vez en Supabase: Dashboard > SQL Editor > New query > pegar > Run
--
-- Correccion: administrador debe poder registrar (insert) gastos,
-- reposiciones, previstos y arqueos igual que soporte/jefe. Lo que NO debe
-- poder hacer es editarlos ni eliminarlos una vez guardados -- esas
-- politicas (update/delete, restringidas a auth_es_soporte_o_jefe()) ya
-- quedaron correctas en la migracion 0010 y no cambian aqui.

drop policy "soporte y jefe escriben reposiciones" on caja_reposiciones;
create policy "usuarios con perfil registran reposiciones" on caja_reposiciones
  for insert with check (auth_tiene_perfil());

drop policy "soporte y jefe escriben previstos" on caja_previstos;
create policy "usuarios con perfil registran previstos" on caja_previstos
  for insert with check (auth_tiene_perfil());

drop policy "soporte y jefe escriben gastos" on caja_gastos;
create policy "usuarios con perfil registran gastos" on caja_gastos
  for insert with check (auth_tiene_perfil());

drop policy "soporte y jefe escriben arqueos" on caja_arqueos;
create policy "usuarios con perfil registran arqueos" on caja_arqueos
  for insert with check (auth_tiene_perfil());
